' The colours a board is drawn in.
'
' A shop can now set these to anything, so the server resolves the palette and
' sends it down in `config.palette` as 0xRRGGBBAA. BoardPalette() below is what
' every pane should call; it reads that field and does no colour maths of its
' own, which is the point — the arithmetic that turns three chosen colours into
' seven lives in one place (lib/palette.ts) and runs once, on the server.
'
' BoardTheme() is the fallback underneath it: the four stock themes, for a
' board saved before `palette` existed and for the moment before a pane's
' first redraw. It stays in step with THEME_COLORS in lib/palette.ts by hand,
' resolved at the same alphas lib/palette.ts uses (dim 0.60, rule 0.18,
' ad 0.08), which is why these are flat bytes rather than the rgba() the
' stylesheet used to carry.

function BoardTheme(id as String) as Object
    themes = {
        chalk: {
            bg: &h14100DFF
            ink: &hFFFFFFFF
            dim: &hA19F9EFF
            rule: &h3E3B39FF
            accent: &hFFC72CFF
            ad: &h272320FF
            onAccent: &h14100DFF
        }
        enamel: {
            bg: &hF3EAD6FF
            ink: &h241D12FF
            dim: &h776F60FF
            rule: &hCEC5B3FF
            accent: &h8A6A2FFF
            ad: &hE2DAC6FF
            onAccent: &hFFFFFFFF
        }
        warm: {
            bg: &hB4502FFF
            ink: &hFDF3E7FF
            dim: &hE0B29DFF
            rule: &hC16D50FF
            accent: &hFFD9A0FF
            ad: &hBA5D3EFF
            onAccent: &h111111FF
        }
        garden: {
            bg: &h12372AFF
            ink: &hF4F1E4FF
            dim: &h9AA79AFF
            rule: &h3B584BFF
            accent: &hD9B45CFF
            ad: &h244639FF
            onAccent: &h12372AFF
        }
    }

    if themes.doesExist(id) then return themes[id]
    return themes.chalk
end function

' The palette for a board, as the server resolved it. Falls back to the stock
' theme when the field is missing, which is the only case a channel in the
' field will meet: a TV that has not polled since the shop recoloured is
' running last night's board, and last night's board had a theme.
function BoardPalette(config as Object) as Object
    if config <> invalid and config.palette <> invalid
        sent = config.palette
        ' Every key or none: a half-built palette would draw text the same
        ' colour as the ground it sits on, which is worse than the old theme.
        keys = ["bg", "ink", "accent", "dim", "rule", "ad", "onAccent"]
        ok = true
        for each key in keys
            if type(sent[key]) <> "String" and type(sent[key]) <> "roString" then ok = false
        end for
        if ok
            out = {}
            for each key in keys
                out[key] = HexToColor(sent[key])
            end for
            return out
        end if
    end if

    id = "chalk"
    if config <> invalid and config.board <> invalid and type(config.board.theme) = "roString"
        id = config.board.theme
    end if
    return BoardTheme(id)
end function

' "0xRRGGBBAA" -> the Integer SceneGraph wants.
'
' Read in two halves because a BrightScript Integer is 32 bits *signed*, so
' 0xFFFFFFFF is -1 and the whole eight digits do not fit through val() as one
' number. The top half is sign-corrected by hand, which is the same thing the
' literal &hFFFFFFFF elsewhere in this file already does silently.
function HexToColor(text as String) as Integer
    body = text
    if Len(body) > 2 and LCase(Left(body, 2)) = "0x" then body = Mid(body, 3)
    ' Opaque unless the sender said otherwise; nothing on a board is glass.
    if Len(body) = 6 then body = body + "FF"
    if Len(body) <> 8 then return &h000000FF

    high = val(Left(body, 4), 16)
    low = val(Mid(body, 5, 4), 16)
    if high >= 32768 then high = high - 65536
    return (high * 65536) + low
end function

' ---- the lettering -------------------------------------------------------
'
' A Font node takes a `uri`, so a board set in Playfair is drawn in Playfair
' here too: ConfigTask downloads the two weights the shop chose and verifies
' them, and BoardFace() below points this at the files. A face that did not
' download, or a shop still on the stock face, falls through to the system
' font — which is what every board did before this and is a perfectly good
' menu board, just not the one they picked.
'
' NOTE the bold system URI is `font:BoldSystemFontFile`, not
' `SystemBoldFontFile`. The wrong name fails silently: every bold label -- the
' shop name, the sections, the item names, the prices -- simply does not draw
' while the regular text does. It cost a trip to the TV once already.

' Tell this component which files to draw with, before anything asks for a
' font. Both arguments are cachefs: paths or "". Clears the cache, because the
' sizes already in it are cut from the old face.
sub SetBoardFaces(displayUri as String, bodyUri as String)
    if m.displayUri = displayUri and m.bodyUri = bodyUri then return
    m.displayUri = displayUri
    m.bodyUri = bodyUri
    m.fontCache = {}
end sub

' The two weights of one face, off the board's fontFiles. Returns "" for a
' file that is missing or did not survive its download, which is the same
' answer as "use the system font".
function BoardFace(board as Object, role as String, bold as Boolean) as String
    if board = invalid or board.fontFiles = invalid then return ""
    face = board.fontFiles[role]
    if face = invalid then return ""
    weight = "regular"
    if bold then weight = "bold"
    file = face[weight]
    if file = invalid then return ""
    ' A local path only. A URL here means the download did not finish, and a
    ' Font node pointed at a URL blocks the render thread on the network.
    ' textOf() rather than a component's own strOr(): this file is included by
    ' several components and each of those already defines one.
    src = textOf(file.src)
    if Left(LCase(src), 4) = "http" then return ""
    return src
end function

' A Font node at an arbitrary pixel size.
'
' Cached per component: a redraw asks for the same handful of sizes once per
' label and again on every pass of the fit loop, and each miss is a node.
function BoardFont(size as Integer, bold as Boolean) as Object
    if m.fontCache = invalid then m.fontCache = {}

    key = size.ToStr()
    if bold then key = key + "b"
    if m.fontCache.doesExist(key) then return m.fontCache[key]

    ' Bold is the board's display face -- the name, the sections, the item
    ' names, the prices -- and regular is its body face. That is the same
    ' split the web preview makes with --bd-display and --bd-body, and it is
    ' why there is no third choice here.
    uri = ""
    if bold
        if m.displayUri <> invalid then uri = m.displayUri
    else
        if m.bodyUri <> invalid then uri = m.bodyUri
    end if

    font = CreateObject("roSGNode", "Font")
    if uri <> ""
        font.uri = uri
    else if bold
        font.uri = "font:BoldSystemFontFile"
    else
        font.uri = "font:SystemFontFile"
    end if
    font.size = size

    m.fontCache[key] = font
    return font
end function

' ---- a screen hung on its end ---------------------------------------------
' A Roku always draws a 1920x1080 frame in the panel's own coordinates. On a
' TV turned ninety degrees the person in front of it sees a 1080x1920 picture,
' so the board is laid out in that space and the whole thing is rotated into
' the frame. `turn` is which way the TV went: "left" means its top edge is now
' at the viewer's left (turned anticlockwise), so the picture turns clockwise
' to come out upright; "right" is the reverse. Empty means landscape.
'
' Returns the rotation and translation to put on a node whose own coordinate
' space is the 1080x1920 canvas, with `offset` being where in that canvas the
' node sits. SceneGraph's rotation is anticlockwise-positive about the node's
' origin, applied before its translation.
function PortraitTransform(turn as String, offsetX as Float, offsetY as Float) as Object
    if turn = "right"
        ' (x, y) -> (y, 1080 - x)
        return { rotation: 1.5707963, translation: [offsetY, 1080 - offsetX] }
    end if
    ' (x, y) -> (1920 - y, x)
    return { rotation: -1.5707963, translation: [1920 - offsetY, offsetX] }
end function

' The canvas a board is laid out on: the frame itself, or the frame on its end.
function CanvasFor(board as Object) as Object
    turn = ""
    if board <> invalid and lowerText(board.orientation) = "portrait"
        turn = "left"
        if lowerText(board.turn) = "right" then turn = "right"
    end if
    if turn = "" then return { width: 1920, height: 1080, turn: "" }
    return { width: 1080, height: 1920, turn: turn }
end function

' ---- where a board's files live -------------------------------------------
' Shared because two panes need them: AdPane opens a spot's artwork and its
' video, and BoardScene opens the shop's own clip on the stage.

' A board lists its artwork relative to itself. Inside a package that means
' pkg:/; fetched over HTTP it means the directory the board was fetched from.
function resolveSrc(src as String, config as Object) as String
    lowered = LCase(src)
    if Left(lowered, 5) = "http:" then return src
    if Left(lowered, 6) = "https:" then return src
    if Left(lowered, 4) = "pkg:" then return src
    if Left(lowered, 9) = "cachefs:/" then return src
    if Left(lowered, 4) = "tmp:" then return src

    ' textOf rather than AdPane's strOr: this is shared code now, and an
    ' absent baseUrl and an empty one mean the same thing here.
    base = textOf(config.baseUrl)
    if base = "" then return "pkg:/" + src

    if Left(src, 1) = "/"
        ' Root-relative: keep the scheme and host, drop the rest of the path.
        slash = base.Instr(8, "/")
        if slash >= 0 then return Left(base, slash) + src
        return base + Mid(src, 2)
    end if

    return base + src
end function

function videoFormatFor(url as String) as String
    lowered = LCase(url)
    if Instr(1, lowered, ".m3u8") > 0 then return "hls"
    if Instr(1, lowered, ".webm") > 0 then return "mp4"
    return "mp4"
end function

function textOf(value as Dynamic) as String
    if type(value) = "String" or type(value) = "roString" then return value
    return ""
end function

function lowerText(value as Dynamic) as String
    if type(value) = "String" or type(value) = "roString" then return LCase(value)
    return ""
end function
