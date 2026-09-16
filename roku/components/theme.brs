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
