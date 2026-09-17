sub init()
    m.top.functionName = "loadConfig"
end sub

sub loadConfig()
    packaged = readJsonFile("pkg:/board.json")

    ' A package that names a sync server is the universal channel: the TV
    ' registers itself, shows a pairing code until a shop claims it, then
    ' polls that server for its board. Everything below this block is the
    ' older path, a hand-served board.json, kept for the demo packages.
    syncUrl = resolveSyncUrl(packaged)
    if syncUrl <> ""
        syncWithServer(syncUrl, packaged)
        return
    end if

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
    ' ReadAsciiFile prints its own error when the file is absent, which is the
    ' normal case for cachefs: on a fresh install, so ask first.
    fs = CreateObject("roFileSystem")
    if not fs.Exists(path) then return invalid

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

' ---- sync mode -------------------------------------------------------------
'
' One POST carries everything the TV has to say (its identity, the etag of the
' board on the wall, the spots it played) and everything it needs to hear (a
' pairing code, "nothing changed", or a new board). Assets named by a board
' are downloaded and verified before the board is shown; nothing streams.

function resolveSyncUrl(packaged as Dynamic) as String
    section = CreateObject("roRegistrySection", "adbite")
    if section.Exists("syncUrl")
        stored = section.Read("syncUrl")
        if stored <> "" then return stored
    end if
    if packaged <> invalid and packaged.syncUrl <> invalid and type(packaged.syncUrl) = "String"
        return packaged.syncUrl
    end if
    return ""
end function

sub syncWithServer(syncUrl as String, packaged as Dynamic)
    ' What is already on the wall goes up first: the last board this server
    ' sent, else the packaged pairing card.
    cached = readJsonFile("cachefs:/board.json")
    if cached <> invalid and cached.board <> invalid
        m.top.source = "cache"
        m.top.config = cached
    else if packaged <> invalid
        m.top.source = "package"
        m.top.config = packaged
    end if

    identity = readIdentity()
    if identity = invalid
        identity = register(syncUrl)
        if identity = invalid then return
    end if

    response = postSync(syncUrl, identity)
    if response = invalid then return

    if response.reregister = true
        ' The server no longer knows this TV. Start again, once.
        clearIdentity()
        identity = register(syncUrl)
        if identity = invalid then return
        response = postSync(syncUrl, identity)
        if response = invalid then return
    end if

    ' Whatever the answer, the plays in the request were received.
    if m.top.plays <> invalid then m.top.playsAccepted = m.top.plays.count()

    if response.paired = false
        pairing = {}
        if packaged <> invalid then pairing.append(packaged)
        pairing.pairing = true
        pairing.pairCode = strOr(response.pairCode, "")
        pairing.refreshMinutes = numOr(response.refreshMinutes, 1)
        pairing.syncUrl = syncUrl
        ' A screen that was paired and is not any more must not keep the old
        ' shop's menu on the wall.
        DeleteFile("cachefs:/board.json")
        writeEtag("")
        m.top.source = "pairing"
        m.top.config = pairing
        m.top.error = ""
        return
    end if

    if response.unchanged = true
        m.top.error = ""
        return
    end if

    if response.board = invalid
        m.top.error = "The sync server sent something that is not a board"
        return
    end if

    ' Every asset local, verified by size, before the board is handed over.
    if not ensureAssets(response)
        m.top.error = "Waiting on assets; keeping the board that is up"
        return
    end if
    pruneAssets(response)
    reportCache()

    response.syncUrl = syncUrl
    writeJsonFile("cachefs:/board.json", response)
    writeEtag(strOr(response.etag, ""))
    m.top.source = "sync"
    m.top.config = response
    m.top.error = ""
end sub

' ---- identity ---------------------------------------------------------------

function readIdentity() as Dynamic
    section = CreateObject("roRegistrySection", "adbite")
    if not section.Exists("deviceId") or not section.Exists("secret") then return invalid
    id = section.Read("deviceId")
    secret = section.Read("secret")
    if id = "" or secret = "" then return invalid
    return { deviceId: id, secret: secret }
end function

sub clearIdentity()
    section = CreateObject("roRegistrySection", "adbite")
    section.Delete("deviceId")
    section.Delete("secret")
    section.Delete("etag")
    section.Flush()
end sub

function register(syncUrl as String) as Dynamic
    body = { channelVersion: channelVersion() }
    response = postJson(syncUrl + "/register", body, 20000)
    if response = invalid then return invalid
    if response.deviceId = invalid or response.secret = invalid
        m.top.error = "Registration did not return an identity"
        return invalid
    end if
    section = CreateObject("roRegistrySection", "adbite")
    section.Write("deviceId", response.deviceId)
    section.Write("secret", response.secret)
    section.Flush()
    return { deviceId: response.deviceId, secret: response.secret }
end function

function postSync(syncUrl as String, identity as Object) as Dynamic
    body = {
        deviceId: identity.deviceId,
        secret: identity.secret,
        etag: readEtag(),
        channelVersion: channelVersion(),
        plays: [],
        storage: storageReport()
    }
    if m.top.plays <> invalid then body.plays = m.top.plays
    return postJson(syncUrl + "/sync", body, 30000)
end function

' What this screen's spots are costing it, sent with every sync.
'
' The same numbers the OPTIONS overlay shows, but nobody has to be standing
' in the shop with the remote to read them -- and on a TV that refuses ECP
' key presses, nobody could read them at all. A fleet that reports its own
' disk is a fleet whose limits can be seen before one of them fills up.
function storageReport() as Object
    fs = CreateObject("roFileSystem")
    used = 0
    count = 0
    files = fs.Find("cachefs:/", "^a-")
    if files <> invalid
        for each name in files
            stat = fs.Stat("cachefs:/" + name)
            if stat <> invalid and stat.size <> invalid
                used = used + stat.size
                count = count + 1
            end if
        end for
    end if

    report = { files: count, usedMb: Int(used / 1048576) }
    info = fs.GetVolumeInfo("cachefs:")
    if info <> invalid and info.blocks <> invalid and info.blocksize <> invalid
        report.totalMb = Int(info.blocks * info.blocksize / 1048576)
        if info.freeblocks <> invalid then report.freeMb = Int(info.freeblocks * info.blocksize / 1048576)
    end if
    return report
end function

function channelVersion() as String
    return CreateObject("roAppInfo").GetVersion()
end function

' ---- HTTP -------------------------------------------------------------------

' NOTE: a BrightScript associative array is case-insensitive, so FormatJson
' writes every key in lower case: what leaves here is `deviceid`, never
' `deviceId`. The device endpoints read their fields case-insensitively for
' exactly this reason; do not "fix" the casing on one side alone.
function postJson(url as String, body as Object, timeoutMs as Integer) as Dynamic
    xfer = CreateObject("roUrlTransfer")
    port = CreateObject("roMessagePort")
    xfer.SetMessagePort(port)
    xfer.SetUrl(url)
    xfer.SetCertificatesFile("common:/certs/ca-bundle.crt")
    xfer.InitClientCertificates()
    xfer.AddHeader("Content-Type", "application/json")
    xfer.AddHeader("Accept", "application/json")
    ' roUrlTransfer sends `Expect: 100-continue` on a POST and then waits for a
    ' go-ahead the edge never sends, so the headers arrive and the body does
    ' not: the server reads it as a request with no fields. An empty Expect
    ' header removes it.
    xfer.AddHeader("Expect", "")
    ' No EnableEncodings on a POST: with it on, the body arrives empty at the
    ' server on this firmware, which reads as "no deviceId" rather than as an
    ' error. Responses here are small enough that the compression is no loss.
    xfer.RetainBodyOnError(true)

    payload = FormatJson(body)
    if payload = "" or payload = invalid
        m.top.error = "Could not encode the request body"
        return invalid
    end if

    if not xfer.AsyncPostFromString(payload)
        m.top.error = "Could not start a request to " + url
        return invalid
    end if

    event = wait(timeoutMs, port)
    if event = invalid
        xfer.AsyncCancel()
        m.top.error = "Timed out talking to " + url
        return invalid
    end if
    if type(event) <> "roUrlEvent"
        m.top.error = "Unexpected response from " + url
        return invalid
    end if

    code = event.GetResponseCode()
    parsed = ParseJson(event.GetString())
    if parsed = invalid or type(parsed) <> "roAssociativeArray"
        m.top.error = "HTTP " + code.ToStr() + " from " + url + " with no JSON"
        return invalid
    end if
    if code = 401 and parsed.reregister = true then return parsed
    if code <> 200
        m.top.error = "HTTP " + code.ToStr() + " from " + url + ": " + strOr(parsed.message, "")
        return invalid
    end if
    return parsed
end function

' ---- assets -----------------------------------------------------------------
'
' Files live in cachefs: under a name made from their hash, so the same
' creative booked twice is stored once and a re-cut of it is a new file. The
' board's `src` is rewritten to the local path; AdPane never sees a URL.

function assetPath(ad as Object) as String
    sha = strOr(ad.sha256, "")
    if sha = "" then return ""
    ext = extensionOf(strOr(ad.src, ""))
    return "cachefs:/a-" + Left(sha, 20) + ext
end function

function extensionOf(url as String) as String
    cut = url.Instr("?")
    if cut >= 0 then url = Left(url, cut)
    lowered = LCase(url)
    for each ext in [".mp4", ".png", ".jpg", ".jpeg", ".webp"]
        if Right(lowered, Len(ext)) = ext then return ext
    end for
    return ".bin"
end function

function fileSize(path as String) as Integer
    fs = CreateObject("roFileSystem")
    if not fs.Exists(path) then return -1
    stat = fs.Stat(path)
    if stat = invalid or stat.size = invalid then return -1
    return stat.size
end function

function ensureAssets(board as Object) as Boolean
    if board.ads = invalid or type(board.ads) <> "roArray" then return true
    allGood = true
    for each ad in board.ads
        src = strOr(ad.src, "")
        if Left(LCase(src), 4) = "http"
            local = assetPath(ad)
            expected = Int(numOr(ad.bytes, 0))
            if local = "" or expected <= 0
                print "[adbite] spot "; strOr(ad.id, "?"); " has no hash or size; skipped"
                ad.src = ""
            else if fileSize(local) = expected
                ad.src = local
            else if download(src, local, expected)
                ad.src = local
            else
                allGood = false
            end if
        end if
    end for
    return allGood
end function

function download(url as String, local as String, expected as Integer) as Boolean
    print "[adbite] downloading "; url; " -> "; local
    xfer = CreateObject("roUrlTransfer")
    port = CreateObject("roMessagePort")
    xfer.SetMessagePort(port)
    xfer.SetUrl(url)
    xfer.SetCertificatesFile("common:/certs/ca-bundle.crt")
    xfer.InitClientCertificates()

    DeleteFile(local)
    if not xfer.AsyncGetToFile(local)
        print "[adbite] could not start download of "; url
        return false
    end if

    ' A 4 MB spot on a slow shop uplink; generous, and nothing waits on it.
    event = wait(180000, port)
    if event = invalid
        xfer.AsyncCancel()
        print "[adbite] download timed out: "; url
        DeleteFile(local)
        return false
    end if
    if type(event) <> "roUrlEvent" or event.GetResponseCode() <> 200
        print "[adbite] download failed: "; url
        DeleteFile(local)
        return false
    end if

    got = fileSize(local)
    if got <> expected
        print "[adbite] size mismatch for "; url; ": got "; got; " expected "; expected
        DeleteFile(local)
        return false
    end if
    return true
end function

' What the spots are costing this device, printed on every board change. The
' overlay shows the same figures, but a TV whose remote is in a drawer (or
' whose "Control by mobile apps" setting blocks ECP) can only be read here.
sub reportCache()
    fs = CreateObject("roFileSystem")
    used = 0
    count = 0
    files = fs.Find("cachefs:/", "^a-")
    if files <> invalid
        for each name in files
            stat = fs.Stat("cachefs:/" + name)
            if stat <> invalid and stat.size <> invalid
                used = used + stat.size
                count = count + 1
            end if
        end for
    end if

    line = "[adbite] cache: " + count.ToStr() + " file(s), " + Int(used / 1048576).ToStr() + " MB"
    info = fs.GetVolumeInfo("cachefs:")
    if info <> invalid and info.blocks <> invalid and info.blocksize <> invalid
        total = info.blocks * info.blocksize / 1048576
        free = 0
        if info.freeblocks <> invalid then free = info.freeblocks * info.blocksize / 1048576
        line = line + "; volume " + Int(free).ToStr() + " MB free of " + Int(total).ToStr() + " MB"
    end if
    print line
end sub

' Files no current board names are dropped, so the cache stays the size of
' one board's worth of spots.
sub pruneAssets(board as Object)
    keep = {}
    if board.ads <> invalid
        for each ad in board.ads
            keep[strOr(ad.src, "")] = true
        end for
    end if
    fs = CreateObject("roFileSystem")
    files = fs.Find("cachefs:/", "^a-")
    if files = invalid then return
    for each name in files
        path = "cachefs:/" + name
        if not keep.doesExist(path)
            print "[adbite] pruning "; path
            DeleteFile(path)
        end if
    end for
end sub

function strOr(value as Dynamic, fallback as String) as String
    if value = invalid or type(value) <> "String" and type(value) <> "roString" then return fallback
    return value
end function

function numOr(value as Dynamic, fallback as Float) as Float
    if value = invalid then return fallback
    t = type(value)
    if t = "Integer" or t = "Float" or t = "Double" or t = "roInt" or t = "roInteger" or t = "roFloat" or t = "roDouble" or t = "LongInteger" then return value
    return fallback
end function
