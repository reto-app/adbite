sub init()
    m.top.functionName = "loadConfig"
end sub

sub loadConfig()
    packaged = readJsonFile("pkg:/board.json")

    ' Put the packaged board up straight away. Everything after this is an
    ' upgrade to what is already on the wall, never a prerequisite for it.
    if packaged <> invalid
        m.top.source = "package"
        m.top.config = packaged
    end if

    url = resolveRemoteUrl(packaged)
    if url = ""
        if packaged = invalid
            m.top.error = "No board.json in the package and no remote URL set."
        end if
        return
    end if

    ' Only the copy actually on the wall may be revalidated. A cache older than
    ' the packaged board is not being shown, so offering its tag would earn a
    ' 304 and leave the TV on the packaged menu forever.
    showingCache = false
    cached = readJsonFile("cachefs:/board.json")
    if cached <> invalid and isNewer(cached, packaged)
        showingCache = true
        m.top.source = "cache"
        m.top.config = cached
    end if

    fetched = fetchJson(url, showingCache)
    if fetched = invalid then return

    ' Artwork is named relative to the board that lists it ("ads/c1.jpg"), so
    ' where the board came from has to travel with it. Stamped before the copy
    ' is cached, so the cached board resolves its artwork too.
    fetched.baseUrl = baseOf(url)
    writeJsonFile("cachefs:/board.json", fetched)
    m.top.source = "remote"
    m.top.config = fetched
end sub

' ---- the conditional request ----------------------------------------------

' The tag the server gave us for the copy in cachefs:. Sending it back turns a
' daily poll of an unchanged menu into a 304 and a few hundred bytes, and means
' a board that has not moved never gets redrawn on the wall.
function readEtag() as String
    section = CreateObject("roRegistrySection", "adbite")
    if not section.Exists("etag") then return ""
    return section.Read("etag")
end function

sub writeEtag(etag as String)
    section = CreateObject("roRegistrySection", "adbite")
    if etag = ""
        section.Delete("etag")
    else
        section.Write("etag", etag)
    end if
    section.Flush()
end sub

' A URL set on the device beats one baked into the package, so a shop can be
' repointed without a re-sideload once there is something to point at.
function resolveRemoteUrl(packaged as Dynamic) as String
    if m.top.remoteUrl <> "" then return m.top.remoteUrl

    section = CreateObject("roRegistrySection", "adbite")
    if section.Exists("remoteUrl")
        stored = section.Read("remoteUrl")
        if stored <> "" then return stored
    end if

    if packaged <> invalid and packaged.remoteUrl <> invalid and type(packaged.remoteUrl) = "String"
        return packaged.remoteUrl
    end if

    return ""
end function

' Everything up to and including the last slash: the directory a relative
' artwork path hangs off.
function baseOf(url as String) as String
    cut = url.Instr("?")
    if cut >= 0 then url = Left(url, cut)

    for i = Len(url) - 1 to 0 step -1
        if Mid(url, i + 1, 1) = "/" then return Left(url, i + 1)
    end for
    return ""
end function

function readJsonFile(path as String) as Dynamic
    raw = ReadAsciiFile(path)
    if raw = invalid or raw = "" then return invalid

    parsed = ParseJson(raw)
    if parsed = invalid or type(parsed) <> "roAssociativeArray"
        print "[adbite] "; path; " is not valid JSON"
        return invalid
    end if
    return parsed
end function

sub writeJsonFile(path as String, value as Object)
    ok = WriteAsciiFile(path, FormatJson(value))
    if not ok then print "[adbite] could not write "; path
end sub

function fetchJson(url as String, mayRevalidate as Boolean) as Dynamic
    xfer = CreateObject("roUrlTransfer")
    port = CreateObject("roMessagePort")
    xfer.SetMessagePort(port)
    xfer.SetUrl(url)
    xfer.SetCertificatesFile("common:/certs/ca-bundle.crt")
    xfer.InitClientCertificates()
    xfer.AddHeader("Accept", "application/json")
    xfer.EnableEncodings(true)
    xfer.SetRequest("GET")

    etag = readEtag()
    if mayRevalidate and etag <> "" then xfer.AddHeader("If-None-Match", etag)

    if not xfer.AsyncGetToString()
        m.top.error = "Could not start a request to " + url
        return invalid
    end if

    ' Long enough to ride out a slow shop uplink, short enough that a wedged
    ' request does not hold the refresh timer open behind it.
    event = wait(20000, port)
    if event = invalid
        xfer.AsyncCancel()
        m.top.error = "Timed out fetching " + url
        return invalid
    end if

    if type(event) <> "roUrlEvent"
        m.top.error = "Unexpected response fetching " + url
        return invalid
    end if

    code = event.GetResponseCode()

    if code = 304
        ' The board has not moved. What is already on the wall is current, and
        ' redrawing it would be a visible flicker for no reason.
        m.top.error = ""
        return invalid
    end if

    if code <> 200
        m.top.error = "HTTP " + code.ToStr() + " from " + url
        return invalid
    end if

    parsed = ParseJson(event.GetString())
    if parsed = invalid or type(parsed) <> "roAssociativeArray"
        m.top.error = "The board at " + url + " is not valid JSON"
        return invalid
    end if

    writeEtag(responseEtag(event))
    m.top.error = ""
    return parsed
end function

function responseEtag(event as Object) as String
    ' A BrightScript associative array is case-insensitive, so this one lookup
    ' covers ETag, etag and any other casing the server chose.
    headers = event.GetResponseHeaders()
    if headers = invalid then return ""
    if headers.etag <> invalid then return headers.etag
    return ""
end function

' `exportedAt` is an ISO string written by the exporter. String comparison is
' the right test for ISO-8601 in UTC and saves parsing a date on the device.
function isNewer(candidate as Object, against as Dynamic) as Boolean
    if against = invalid then return true
    a = ""
    b = ""
    if candidate.exportedAt <> invalid then a = candidate.exportedAt.ToStr()
    if against.exportedAt <> invalid then b = against.exportedAt.ToStr()
    return a > b
end function
