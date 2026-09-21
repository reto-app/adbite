' The four board themes, in the same colours the web preview draws.
'
' Kept in step with `.board-canvas.theme-*` in app/globals.css by hand. The
' rgba() dims there become Roku's 0xRRGGBBAA, so a change on the site is a
' change here: alpha is the last byte, and 0.58 opacity is 0x94.

function BoardTheme(id as String) as Object
    themes = {
        chalk: {
            bg: &h14100DFF
            ink: &hFFFFFFFF
            dim: &hFFFFFF94
            rule: &hFFFFFF29
            accent: &hFFC72CFF
            ad: &hFFFFFF12
            onAccent: &h14100DFF
        }
        enamel: {
            bg: &hF3EAD6FF
            ink: &h241D12FF
            dim: &h241D1299
            rule: &h241D1229
            accent: &h8A6A2FFF
            ad: &h241D120F
            onAccent: &hF3EAD6FF
        }
        warm: {
            bg: &hB4502FFF
            ink: &hFDF3E7FF
            dim: &hFDF3E7AD
            rule: &hFDF3E73D
            accent: &hFFD9A0FF
            ad: &hFDF3E71A
            onAccent: &hB4502FFF
        }
        garden: {
            bg: &h12372AFF
            ink: &hF4F1E4FF
            dim: &hF4F1E49E
            rule: &hF4F1E42E
            accent: &hD9B45CFF
            ad: &hF4F1E414
            onAccent: &h12372AFF
        }
    }

    if themes.doesExist(id) then return themes[id]
    return themes.chalk
end function

' A Font node at an arbitrary pixel size. The system font files are addressable
' by URI, which is what keeps the package free of a bundled TTF.
'
' Cached per component: a redraw asks for the same handful of sizes once per
' label and again on every pass of the fit loop, and each miss is a node.
function BoardFont(size as Integer, bold as Boolean) as Object
    if m.fontCache = invalid then m.fontCache = {}

    key = size.ToStr()
    if bold then key = key + "b"
    if m.fontCache.doesExist(key) then return m.fontCache[key]

    font = CreateObject("roSGNode", "Font")
    if bold
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

function lowerText(value as Dynamic) as String
    if type(value) = "String" or type(value) = "roString" then return LCase(value)
    return ""
end function
