sub init()
    ' A short dissolve between spots. Long enough to read as intentional,
    ' short enough that nobody catches the board mid-change.
    fadeSeconds = 0.4
    m.theme = BoardTheme("chalk")
    m.ads = []
    m.index = -1
    m.showingFull = false
    m.resting = false
    m.videoPending = false
    m.holdingPlate = false
    m.slotless = false

    ' --- the slot, drawn in place ---
    m.slotGroup = m.top.createChild("Group")
    m.slotBg = m.slotGroup.createChild("Rectangle")
    m.hatch = m.slotGroup.createChild("Group")
    m.slotPoster = m.slotGroup.createChild("Poster")
    m.slotPoster.id = "slotPoster"
    m.slotPoster.opacity = 0
    m.slotPoster.observeField("loadStatus", "onSlotPosterLoad")
    m.placeholder = m.slotGroup.createChild("Group")

    ' --- the whole screen, for full and video spots ---
    m.fullGroup = m.top.createChild("Group")
    m.fullGroup.visible = false
    m.fullBg = m.fullGroup.createChild("Rectangle")
    m.fullBg.width = 1920
    m.fullBg.height = 1080
    m.fullPoster = m.fullGroup.createChild("Poster")
    m.fullPoster.width = 1920
    m.fullPoster.height = 1080
    m.fullPoster.loadDisplayMode = "scaleToFit"
    m.fullVideo = m.fullGroup.createChild("Video")
    m.fullVideo.width = 1920
    m.fullVideo.height = 1080
    m.fullVideo.translation = [0, 0]
    m.fullVideo.visible = false
    m.fullVideo.mute = true
    m.fullVideo.enableUI = false
    m.fullVideo.observeField("state", "onVideoState")

    m.fade = m.top.createChild("Animation")
    m.fade.duration = fadeSeconds
    m.fade.easeFunction = "linear"
    m.fadeInterp = m.fade.createChild("FloatFieldInterpolator")
    m.fadeInterp.key = [0.0, 1.0]
    m.fadeInterp.keyValue = [0.0, 1.0]
    m.fadeInterp.fieldToInterp = "slotPoster.opacity"

    m.timer = m.top.createChild("Timer")
    m.timer.repeat = false
    m.timer.observeField("fire", "advance")
end sub

sub reload()
    config = m.top.config
    if config = invalid or config.board = invalid then return

    m.theme = BoardTheme(strOr(config.board.theme, "chalk"))
    m.spotSeconds = spotSeconds()

    slot = m.top.slot
    if slot = invalid or slot.count() < 4 then return
    m.slotGroup.translation = [slot[0], slot[1]]
    m.slotW = slot[2]
    m.slotH = slot[3]

    ' A zero-width slot means nothing was sold in the menu's frame; only the
    ' full-screen formats have anywhere to go.
    m.slotless = (m.slotW <= 0)
    m.slotGroup.visible = not m.slotless

    m.slotBg.width = m.slotW
    m.slotBg.height = m.slotH
    m.slotBg.color = blendOver(m.theme.ad, m.theme.bg)

    m.slotPoster.width = m.slotW
    m.slotPoster.height = m.slotH
    m.slotPoster.loadDisplayMode = "scaleToFit"

    m.fullBg.color = m.theme.bg

    if not m.slotless
        drawHatch()
        drawPlaceholder()
    end if

    m.ads = playableAds(config)
    m.index = -1
    m.timer.control = "stop"

    if m.ads.count() = 0
        m.top.playingVideo = false
        m.placeholder.visible = true
        m.slotPoster.opacity = 0
        hideFull()
        return
    end if

    m.placeholder.visible = false
    advance()
end sub

' ---- the rotation ---------------------------------------------------------

sub advance()
    if m.ads.count() = 0 then return

    ' A full-screen spot hands the wall back to the menu for one interval
    ' before the next takeover. Otherwise a board whose only booking is a
    ' video is a video with a menu nobody ever sees behind it.
    ' A spot marked `chain: true` runs straight into the next one instead, for
    ' a reel of clips that should play as a sequence.
    current = invalid
    if m.index >= 0 and m.index < m.ads.count() then current = m.ads[m.index]
    chained = current <> invalid and current.chain = true
    if m.showingFull and not m.resting and not chained
        upcoming = m.ads[(m.index + 1) mod m.ads.count()]
        upcomingFormat = strOr(upcoming.format, "rail")
        if upcomingFormat = "video" or upcomingFormat = "full"
            m.resting = true
            hideFull()
            ' Show the unsold-slot placeholder unless a rail spot is still up.
            if m.slotPoster.opacity = 0 then m.placeholder.visible = true
            queueNext(m.spotSeconds)
            return
        end if
    end if
    m.resting = false
    m.placeholder.visible = false

    m.index = (m.index + 1) mod m.ads.count()
    ad = m.ads[m.index]
    format = strOr(ad.format, "rail")

    if format = "video"
        playVideo(ad)
        return
    end if

    if format = "full"
        showFullPoster(ad)
        return
    end if

    hideFull()
    m.fade.control = "stop"
    m.slotPoster.opacity = 0
    m.slotPoster.uri = strOr(ad.src, "")
    queueNext(adSeconds(ad))
end sub

' What actually reached the wall, for billing and for the advertiser's
' numbers. Reported at the moment the spot is visible, never when it was
' merely scheduled.
sub reportPlay(ad as Object, seconds as Float)
    if ad = invalid or ad.id = invalid then return
    now = CreateObject("roDateTime")
    m.top.played = { id: ad.id, at: now.ToISOString(), seconds: seconds }
end sub

sub onSlotPosterLoad()
    status = m.slotPoster.loadStatus
    if status = "ready"
        m.fade.control = "start"
        if m.index >= 0 and m.index < m.ads.count() then reportPlay(m.ads[m.index], adSeconds(m.ads[m.index]))
    else if status = "failed"
        ' A spot whose artwork will not decode is dead weight in the rotation.
        ' Drop it and move on rather than holding a blank rail for 15 seconds.
        print "[adbite] artwork failed to load: "; m.slotPoster.uri
        if m.ads.count() > 1
            m.ads.delete(m.index)
            ' Step back so the ad that shifted into this slot is the one
            ' advance() lands on, rather than being skipped over.
            m.index = m.index - 1
            m.timer.control = "stop"
            advance()
        else
            m.ads = []
            m.placeholder.visible = true
        end if
    end if
end sub

sub showFullPoster(ad as Object)
    m.fullVideo.control = "stop"
    m.fullVideo.visible = false
    m.fullPoster.visible = true
    m.fullPoster.uri = strOr(ad.src, "")
    m.fullGroup.visible = true
    m.showingFull = true
    reportPlay(ad, adSeconds(ad))
    queueNext(adSeconds(ad))
end sub

sub playVideo(ad as Object)
    content = CreateObject("roSGNode", "ContentNode")
    content.url = strOr(ad.src, "")
    content.streamFormat = videoFormatFor(content.url)
    content.title = strOr(ad.name, "")

    ' The takeover is not revealed until the stream reports "playing": a Roku
    ' takes a second or more to open even a packaged file, and showing the
    ' Video node before then puts a black plane over the menu while it waits.
    ' The plane itself also stays hidden until then, so a plate already held
    ' between chained clips is a dark dip and not a black rectangle.
    m.fullPoster.visible = false
    m.fullVideo.visible = false
    if not m.holdingPlate then m.fullGroup.visible = false
    m.holdingPlate = false
    m.showingFull = true
    m.videoPending = true

    ' `loop: true` hands the repeat to the player, which rewinds without
    ' re-opening the file; a rotation would show the plate for the second
    ' that takes. Such a spot never finishes, so it is the whole rotation.
    looping = (ad.loop = true)
    m.fullVideo.loop = looping

    m.top.playingVideo = true
    m.fullVideo.content = content
    m.fullVideo.control = "play"
    m.videoStarted = CreateObject("roTimespan")

    ' A wedged stream must not park the rotation on a black screen, so the
    ' timer still runs behind playback as a backstop.
    if not looping then queueNext(adSeconds(ad) + 3)
end sub

sub onVideoState()
    state = m.fullVideo.state
    elapsed = 0
    if m.videoStarted <> invalid then elapsed = m.videoStarted.TotalMilliseconds()
    print "[adbite] video "; state; " at "; elapsed; "ms"
    if state = "playing" and m.videoPending = true
        m.videoPending = false
        m.fullVideo.visible = true
        m.fullGroup.visible = true
        if m.index >= 0 and m.index < m.ads.count() then reportPlay(m.ads[m.index], adSeconds(m.ads[m.index]))
    else if state = "finished" or state = "error"
        if state = "error" then print "[adbite] video spot failed to play"
        m.videoPending = false
        ' Hide before stopping: a stopped Video node paints black until it is
        ' gone, and that frame would land on the wall. Between chained clips
        ' the dark plate stays up instead, so the menu does not flash for the
        ' second the next stream takes to open.
        current = invalid
        if m.index >= 0 and m.index < m.ads.count() then current = m.ads[m.index]
        m.holdingPlate = (state = "finished" and current <> invalid and current.chain = true)
        m.fullVideo.visible = false
        if not m.holdingPlate then m.fullGroup.visible = false
        m.top.playingVideo = false
        m.timer.control = "stop"
        advance()
    end if
end sub

sub hideFull()
    if m.top.playingVideo then m.top.playingVideo = false
    if not m.showingFull then return
    m.fullGroup.visible = false
    m.fullVideo.visible = false
    m.fullVideo.control = "stop"
    m.showingFull = false
    m.videoPending = false
    m.holdingPlate = false
end sub

sub queueNext(seconds as Float)
    m.timer.control = "stop"
    m.timer.duration = seconds
    m.timer.control = "start"
end sub

' ---- the empty slot -------------------------------------------------------

' The web draws the unsold slot as 45-degree hatching. Roku has no repeating
' gradient, so it is struck as thin rotated rectangles and clipped by the
' slot's own bounds.
sub drawHatch()
    m.hatch.removeChildrenIndex(m.hatch.getChildCount(), 0)
    m.hatch.clippingRect = [0, 0, m.slotW, m.slotH]

    spacing = 29
    span = m.slotW + m.slotH
    x = -m.slotH
    while x < span
        stripe = m.hatch.createChild("Rectangle")
        stripe.width = 2
        stripe.height = span * 1.5
        stripe.color = m.theme.rule
        stripe.translation = [x, -m.slotH]
        stripe.rotation = -0.785398   ' -45 degrees, in radians
        x = x + spacing
    end while
end sub

sub drawPlaceholder()
    m.placeholder.removeChildrenIndex(m.placeholder.getChildCount(), 0)

    share = 0
    config = m.top.config
    if config <> invalid and config.board <> invalid and config.board.adShare <> invalid
        share = config.board.adShare
    end if

    title = m.placeholder.createChild("Label")
    title.text = "Ad space"
    title.font = BoardFont(29, true)
    title.color = m.theme.ink
    title.width = m.slotW
    title.height = 40
    title.horizAlign = "center"
    title.translation = [0, m.slotH / 2 - 42]

    note = m.placeholder.createChild("Label")
    note.text = Str(Int(share * 100 + 0.5)).Trim() + "% of the screen"
    note.font = BoardFont(21, false)
    note.color = m.theme.dim
    note.width = m.slotW
    note.height = 30
    note.horizAlign = "center"
    note.translation = [0, m.slotH / 2 + 4]
end sub

' ---- reading the board ----------------------------------------------------

' A campaign only reaches a TV once the shop has approved it, so the exporter
' writes approved spots and nothing else. This is the second gate: a spot with
' no artwork is skipped rather than shown as a blank rectangle.
function playableAds(config as Object) as Object
    kept = []
    if config.ads = invalid or type(config.ads) <> "roArray" then return kept
    for each ad in config.ads
        src = strOr(ad.src, "").Trim()
        format = strOr(ad.format, "rail")
        fits = (not m.slotless) or format = "video" or format = "full"
        if src <> "" and fits
            ' Resolved once here rather than at every rotation, so the rest of
            ' this component only ever sees something the device can open.
            resolved = { }
            resolved.append(ad)
            resolved.src = resolveSrc(src, config)
            kept.push(resolved)
        end if
    end for
    return kept
end function

' A board lists its artwork relative to itself. Inside a package that means
' pkg:/; fetched over HTTP it means the directory the board was fetched from.
function resolveSrc(src as String, config as Object) as String
    lowered = LCase(src)
    if Left(lowered, 5) = "http:" then return src
    if Left(lowered, 6) = "https:" then return src
    if Left(lowered, 4) = "pkg:" then return src
    if Left(lowered, 9) = "cachefs:/" then return src
    if Left(lowered, 4) = "tmp:" then return src

    base = strOr(config.baseUrl, "")
    if base = "" then return "pkg:/" + src

    if Left(src, 1) = "/"
        ' Root-relative: keep the scheme and host, drop the rest of the path.
        slash = base.Instr(8, "/")
        if slash >= 0 then return Left(base, slash) + src
        return base + Mid(src, 2)
    end if

    return base + src
end function

function adSeconds(ad as Object) as Float
    if ad.seconds <> invalid
        seconds = numOr(ad.seconds, 0)
        if seconds >= 2 then return seconds
    end if
    return m.spotSeconds
end function

function spotSeconds() as Float
    config = m.top.config
    if config <> invalid and config.spotSeconds <> invalid
        seconds = numOr(config.spotSeconds, 0)
        if seconds >= 2 then return seconds
    end if
    return 15
end function

function videoFormatFor(url as String) as String
    lowered = LCase(url)
    if Instr(1, lowered, ".m3u8") > 0 then return "hls"
    if Instr(1, lowered, ".webm") > 0 then return "mp4"
    return "mp4"
end function

' Roku composites an alpha colour against whatever is behind it, and behind the
' rail there is nothing. Flattening against the board's own background keeps
' the rail the same shade as the web preview instead of showing through black.
function blendOver(rgba as Integer, base as Integer) as Integer
    alpha = (rgba and &hFF) / 255.0
    r = mix((rgba >> 24) and &hFF, (base >> 24) and &hFF, alpha)
    g = mix((rgba >> 16) and &hFF, (base >> 16) and &hFF, alpha)
    b = mix((rgba >> 8) and &hFF, (base >> 8) and &hFF, alpha)
    return (r << 24) or (g << 16) or (b << 8) or &hFF
end function

function mix(top as Integer, bottom as Integer, alpha as Float) as Integer
    return Int(top * alpha + bottom * (1 - alpha) + 0.5)
end function

function strOr(value as Dynamic, fallback as String) as String
    if value = invalid then return fallback
    if type(value) = "roString" or type(value) = "String" then return value
    return fallback
end function

function numOr(value as Dynamic, fallback as Float) as Float
    if value = invalid then return fallback
    kind = type(value)
    if kind = "roInt" or kind = "Integer" or kind = "roFloat" or kind = "Float" or kind = "Double" or kind = "roDouble" then return value
    return fallback
end function
