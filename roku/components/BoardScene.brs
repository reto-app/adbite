sub init()
    m.backdrop = m.top.findNode("backdrop")
    m.menu = m.top.findNode("menu")
    m.ads = m.top.findNode("ads")
    m.diagnostics = m.top.findNode("diagnostics")
    m.diagText = m.top.findNode("diagText")
    m.pairing = m.top.findNode("pairing")
    m.tip = m.top.findNode("tip")
    m.pendingPlays = []
    m.demoing = false

    ' The screensaver card hides itself if nobody presses anything, because
    ' a card left over a shop's board all afternoon is worse than the
    ' screensaver it is warning about.
    m.tipTimer = m.top.createChild("Timer")
    m.tipTimer.duration = 90
    m.tipTimer.repeat = false
    m.tipTimer.observeField("fire", "dismissTip")

    m.config = invalid
    m.slotId = ""
    m.source = "loading"
    m.revision = 0
    m.nextRefreshAt = 0

    m.ads.observeField("played", "onPlayed")

    m.slotTimer = m.top.createChild("Timer")
    m.slotTimer.duration = 30
    m.slotTimer.repeat = true
    m.slotTimer.observeField("fire", "checkSlot")

    ' Rescheduled after every fire rather than left repeating, because a daily
    ' refresh is pinned to a wall-clock hour and the gap to the next one is a
    ' different length each time.
    m.refreshTimer = m.top.createChild("Timer")
    m.refreshTimer.repeat = false
    m.refreshTimer.observeField("fire", "onRefreshDue")

    m.loader = CreateObject("roSGNode", "ConfigTask")
    m.loader.observeField("config", "onConfig")
    m.loader.observeField("error", "onLoaderError")
    m.loader.observeField("playsAccepted", "onPlaysAccepted")
    reloadConfig()

    m.slotTimer.control = "start"
    m.top.setFocus(true)
end sub

sub reloadConfig()
    m.loader.control = "stop"
    m.loader.remoteUrl = m.top.launchRemoteUrl
    ' The play log rides along with the sync and is dropped once the server
    ' has taken it. Capped so a TV cut off for a month does not grow a list
    ' without bound; the oldest go first.
    while m.pendingPlays.count() > 2000
        m.pendingPlays.Delete(0)
    end while
    m.loader.plays = m.pendingPlays
    m.loader.control = "RUN"
end sub

' AdPane reports each spot it put on the wall; the scene keeps the list
' between syncs.
sub onPlayed()
    play = m.ads.played
    if play = invalid or play.id = invalid then return
    m.pendingPlays.Push(play)
end sub

sub onPlaysAccepted()
    taken = m.loader.playsAccepted
    if taken <= 0 then return
    kept = []
    for i = taken to m.pendingPlays.count() - 1
        kept.Push(m.pendingPlays[i])
    end for
    m.pendingPlays = kept
end sub

sub onLoaderError()
    if m.loader.error <> "" then print "[adbite] "; m.loader.error
    refreshDiagnostics()
end sub

sub onConfig()
    config = m.loader.config
    if config = invalid or config.board = invalid
        print "[adbite] a board arrived with nothing in it; keeping what is up"
        return
    end if
    ' A board arriving from the server while the demo is up would yank it
    ' away mid-look. The demo is left alone until Back closes it.
    if m.demoing = true then return
    applyBoard(config, m.loader.source)
end sub

sub applyBoard(config as Object, source as String)
    m.config = config
    m.source = source
    m.slotId = currentSlotId()

    if config.pairing = true
        showPairing(strOrDefault(config.pairCode, ""))
    else
        m.pairing.visible = false
        m.menu.visible = true
        m.ads.visible = true
        theme = BoardPalette(config)
        m.backdrop.color = theme.bg
        layout()
        ' A screen that has just been claimed has a board on it for the first
        ' time, which is the moment the pairing code and its instructions
        ' disappear. Said once, then never again on this TV.
        maybeShowTip()
    end if

    startRefresh()
    refreshDiagnostics()
end sub

' Until a shop claims it, the screen is a card with a code and one
' instruction. Kept plain on purpose: it is read across a room by someone
' who has never seen the product.
sub showPairing(code as String)
    m.menu.visible = false
    m.ads.visible = false
    m.backdrop.color = &h0D0D0DFF

    title = m.top.findNode("pairTitle")
    title.font = BoardFont(56, true)
    title.text = "Pair this screen"

    codeLabel = m.top.findNode("pairCode")
    codeLabel.font = BoardFont(180, true)
    if code = ""
        codeLabel.text = "· · · · · ·"
    else
        codeLabel.text = spaced(code)
    end if

    help = m.top.findNode("pairHelp")
    help.font = BoardFont(34, false)
    help.text = "On your computer or phone, sign in at adbite.site/dashboard, open Your TVs, and type this code. The board appears here within a minute." + Chr(10) + Chr(10) + "Press OK to see a sample board first."

    ' Said here because this is the one moment the shop is looking at the TV
    ' with the remote in their hand. A board that blanks after ten minutes
    ' reads as broken, and this is the only thing that stops it.
    tip = m.top.findNode("pairTip")
    tip.font = BoardFont(30, true)
    tip.text = "Before you walk away: turn this TV's screensaver off." + Chr(10) + "Settings  >  Screen saver  >  Wait time  >  Disabled"

    device = CreateObject("roDeviceInfo")
    foot = m.top.findNode("pairFoot")
    foot.font = BoardFont(28, false)
    if code = ""
        foot.text = "Connecting to AdBite… check this TV is on Wi-Fi. Press OPTIONS for details."
    else
        foot.text = "AdBite Board " + CreateObject("roAppInfo").GetVersion() + "  ·  " + device.GetModelDisplayName()
    end if

    m.pairing.visible = true
end sub

' The one thing a shop has to do that the channel is not allowed to do for
' them. Roku forbids an app from interfering with the system screensaver, so
' all that is left is asking, at the moment it matters, exactly once.
sub maybeShowTip()
    if m.demoing = true then return
    section = CreateObject("roRegistrySection", "adbite")
    if section.Exists("screensaverTold") then return

    title = m.top.findNode("tipTitle")
    title.font = BoardFont(52, true)
    title.text = "One thing before you go"

    body = m.top.findNode("tipBody")
    body.font = BoardFont(34, false)
    body.text = "This TV will blank its own screen after a few minutes and cover your board. Turn the screensaver off and it stays up:" + Chr(10) + Chr(10) + "Settings  >  Screen saver  >  Wait time  >  Disabled"

    foot = m.top.findNode("tipFoot")
    foot.font = BoardFont(26, false)
    foot.text = "Press OK when that is done"

    m.tip.visible = true
    m.ads.hold = true
    m.tipTimer.control = "start"

    section.Write("screensaverTold", "1")
    section.Flush()
end sub

sub dismissTip()
    m.tipTimer.control = "stop"
    if not m.tip.visible then return
    m.tip.visible = false
    m.ads.hold = false
end sub

function spaced(code as String) as String
    out = ""
    for i = 0 to Len(code) - 1
        if i > 0 then out = out + " "
        out = out + Mid(code, i + 1, 1)
    end for
    return out
end function

' ---- layout ---------------------------------------------------------------

' The shop sold a shape, not a position: a rail down the right or a strip along
' the foot. Both are the same fraction of the screen, so the menu gets whatever
' is left over in the one dimension the placement uses.
sub layout()
    board = m.config.board
    share = clamp(numOrDefault(board.adShare, 0), 0, 0.5)
    placement = LCase(strOrDefault(m.config.adLayout, "rail"))
    if placement <> "banner" then placement = "rail"

    ' A supplemental screen is a second TV that only runs the reel; the menu
    ' lives on another wall. The pane stays built for OPTIONS diagnostics.
    m.menu.visible = not (m.config.supplemental = true)

    ' On a TV hung on its end the board is laid out 1080 wide by 1920 tall
    ' and the menu is rotated into the frame; the ad pane does its own
    ' turning, because video will not rotate and has to be handled apart.
    canvas = CanvasFor(board)
    W = canvas.width
    H = canvas.height
    m.menu.canvasWidth = W
    m.ads.canvas = [W, H]
    m.ads.turn = canvas.turn
    if canvas.turn = ""
        m.menu.rotation = 0
        m.menu.translation = [0, 0]
    else
        turned = PortraitTransform(canvas.turn, 0, 0)
        m.menu.rotation = turned.rotation
        m.menu.translation = turned.translation
        ' There is no rail on a portrait board; the server sends banner, but
        ' an old board in the cache might not.
        if share > 0 then placement = "banner"
    end if

    if share = 0
        ' No slot sold: the menu takes the whole screen. Full-screen spots
        ' still run, so the pane stays live with an empty slot to draw into.
        m.menu.paneWidth = W
        m.menu.paneHeight = H
        m.ads.visible = true
        m.ads.placement = "none"
        m.ads.slot = [W, 0, 0, H]
    else if placement = "banner"
        adHeight = Int(H * share)
        m.menu.paneWidth = W
        m.menu.paneHeight = H - adHeight
        m.ads.visible = true
        m.ads.placement = "banner"
        m.ads.slot = [0, H - adHeight, W, adHeight]
    else
        adWidth = Int(W * share)
        m.menu.paneWidth = W - adWidth
        m.menu.paneHeight = H
        m.ads.visible = true
        m.ads.placement = "rail"
        m.ads.slot = [W - adWidth, 0, adWidth, H]
    end if

    m.menu.slotId = m.slotId
    m.menu.config = m.config
    m.ads.config = m.config

    m.revision = m.revision + 1
    m.menu.revision = m.revision
    m.ads.revision = m.revision
end sub

' ---- the slot clock -------------------------------------------------------

sub checkSlot()
    if m.config = invalid then return
    now = currentSlotId()
    if now = m.slotId then return

    m.slotId = now
    m.menu.slotId = now
    m.revision = m.revision + 1
    m.menu.revision = m.revision
end sub

function currentSlotId() as String
    windows = invalid
    if m.config <> invalid then windows = m.config.slotWindows
    if windows = invalid or type(windows) <> "roArray" or windows.count() = 0 then return "midday"

    minute = localMinuteOfDay()
    for each window in windows
        startMinute = Int(numOrDefault(window.startMinute, 0))
        endMinute = Int(numOrDefault(window.endMinute, 1440))
        if endMinute > startMinute
            if minute >= startMinute and minute < endMinute then return strOrDefault(window.id, "midday")
        else
            ' A window that runs past midnight, e.g. 22:00 to 02:00.
            if minute >= startMinute or minute < endMinute then return strOrDefault(window.id, "midday")
        end if
    end for

    return strOrDefault(windows[0].id, "midday")
end function

function localMinuteOfDay() as Integer
    now = CreateObject("roDateTime")
    now.ToLocalTime()
    return now.GetHours() * 60 + now.GetMinutes()
end function

' ---- refresh and keep-awake ----------------------------------------------

sub onRefreshDue()
    reloadConfig()
    startRefresh()
end sub

' Two ways to poll, and a board picks one:
'
'   refreshAt "04:00"   once a day at that local time. What a shop on a wall
'                       wants: the menu changes overnight, never mid-service.
'   refreshMinutes 15   a fixed interval. What you want while testing.
'
' `refreshAt` wins when both are set. Either way the board is also fetched once
' at launch, so a TV restarted after a menu change does not wait for its slot.
sub startRefresh()
    remote = strOrDefault(m.config.remoteUrl, "")
    syncing = strOrDefault(m.config.syncUrl, "") <> ""
    if remote = "" and m.top.launchRemoteUrl = "" and not registryHasUrl() and not syncing
        ' Nothing to poll. The packaged board only changes on a re-sideload.
        m.refreshTimer.control = "stop"
        m.nextRefreshAt = 0
        return
    end if

    m.refreshTimer.control = "stop"

    dailyAt = strOrDefault(m.config.refreshAt, "")
    if dailyAt <> ""
        seconds = secondsUntil(dailyAt)
        if seconds > 0
            scheduleIn(seconds)
            return
        end if
        print "[adbite] refreshAt "; dailyAt; " is not a HH:MM time; falling back to the interval"
    end if

    minutes = numOrDefault(m.config.refreshMinutes, 15)
    if minutes < 1 then minutes = 1
    scheduleIn(minutes * 60)
end sub

sub scheduleIn(seconds as Integer)
    m.refreshTimer.duration = seconds
    m.refreshTimer.control = "start"
    ' The timer reports the interval it was given, not what is left of it, so
    ' the due time is kept here for the diagnostics overlay to count down from.
    m.nextRefreshAt = nowSeconds() + seconds
end sub

function nowSeconds() as Integer
    return CreateObject("roDateTime").AsSeconds()
end function

' Seconds from now to the next local "HH:MM", tomorrow if it has already gone
' today. Returns 0 if the string is not a time, which is the caller's signal to
' use the interval instead.
function secondsUntil(clockTime as String) as Integer
    parts = clockTime.Split(":")
    if parts.count() < 2 then return 0

    hours = Val(parts[0].Trim(), 10)
    minutes = Val(parts[1].Trim(), 10)
    if hours < 0 or hours > 23 or minutes < 0 or minutes > 59 then return 0

    now = CreateObject("roDateTime")
    now.ToLocalTime()
    sinceMidnight = now.GetHours() * 3600 + now.GetMinutes() * 60 + now.GetSeconds()
    target = hours * 3600 + minutes * 60

    gap = target - sinceMidnight
    ' Already past today, or so close that the fire would race the clock check.
    if gap < 60 then gap = gap + 86400
    return gap
end function

' The sample board that ships inside every package, used by the demo the
' pairing screen offers. Read on demand rather than held, because it is
' looked at once and then usually never again.
function readDemoBoard() as Dynamic
    fs = CreateObject("roFileSystem")
    if not fs.Exists("pkg:/demo-board.json") then return invalid
    raw = ReadAsciiFile("pkg:/demo-board.json")
    if raw = "" then return invalid
    parsed = ParseJson(raw)
    if parsed = invalid or type(parsed) <> "roAssociativeArray" then return invalid
    return parsed
end function

function registryHasUrl() as Boolean
    section = CreateObject("roRegistrySection", "adbite")
    if not section.Exists("remoteUrl") then return false
    return section.Read("remoteUrl") <> ""
end function

' ---- diagnostics ----------------------------------------------------------

' There is no settings screen and no keyboard on a wall-mounted TV. This is how
' whoever installed it reads back the IP to sideload the next menu to, and
' proves the board on screen is the one that was just sent.
function onKeyEvent(key as String, press as Boolean) as Boolean
    if not press then return false

    ' Anything at all puts the board back. Somebody pressing a button is
    ' somebody who has read it.
    if m.tip.visible
        dismissTip()
        return true
    end if

    ' Back closes whatever is open before it closes the channel, which is
    ' what Roku's certification asks of it: return to the previous state, and
    ' from the first screen exit to the home screen. Returning false here is
    ' what lets the system do the second half.
    if key = "back"
        if m.diagnostics.visible
            m.diagnostics.visible = false
            m.ads.hold = false
            return true
        end if
        if m.demoing = true
            m.demoing = false
            reloadConfig()
            return true
        end if
        return false
    end if

    if key = "options" or key = "info"
        m.diagnostics.visible = not m.diagnostics.visible
        ' A spot playing over the overlay would hide it: the video plane is
        ' above the graphics plane on every Roku. So the rotation pauses for
        ' as long as somebody is reading.
        m.ads.hold = m.diagnostics.visible
        refreshDiagnostics()
        return true
    end if

    ' A reviewer installs this and sees a code they have no dashboard to type
    ' it into, so OK puts the sample board up: a whole working screen, menu,
    ' rotation and all, with no account and no network. Back returns to the
    ' code. It is also the fastest way for a shop to see what they are about
    ' to get before they pair anything.
    if key = "OK" and m.config <> invalid and m.config.pairing = true
        demo = readDemoBoard()
        if demo <> invalid
            m.demoing = true
            applyBoard(demo, "demo")
            return true
        end if
    end if

    if key = "play"
        reloadConfig()
        return true
    end if

    return false
end function

sub refreshDiagnostics()
    if not m.diagnostics.visible then return

    app = CreateObject("roAppInfo")
    device = CreateObject("roDeviceInfo")

    addresses = ""
    interfaces = device.GetIPAddrs()
    for each name in interfaces
        if addresses <> "" then addresses = addresses + ", "
        addresses = addresses + interfaces[name]
    end for

    exported = "never"
    shop = "unknown"
    items = 0
    if m.config <> invalid
        exported = strOrDefault(m.config.exportedAt, "never")
        if m.config.board <> invalid then shop = strOrDefault(m.config.board.shopName, "unknown")
        if m.config.ads <> invalid then items = m.config.ads.count()
    end if

    section = CreateObject("roRegistrySection", "adbite")
    deviceId = "unregistered"
    if section.Exists("deviceId") then deviceId = section.Read("deviceId")

    lines = [
        shop + "  ·  " + m.slotId,
        "board from " + m.source + ", exported " + exported,
        items.ToStr() + " spot(s) in the rotation  ·  " + m.pendingPlays.count().ToStr() + " play(s) to report",
        "polling " + pollingDescription(),
        "device " + deviceId + "  ·  cache " + cacheDescription(),
        "channel " + app.GetVersion() + "  ·  " + device.GetModelDisplayName(),
        "ip " + addresses,
        "",
        "screensaver: Settings > Screen saver > Wait time > Disabled",
        "OPTIONS hides this  ·  PLAY syncs now"
    ]

    m.diagText.font = BoardFont(26, false)
    m.diagText.color = &hFFFFFFFF
    m.diagText.text = joinLines(lines)
end sub

' How much of the device's cache the spots are using, and what is left. On a
' Roku the answer to "what is left" is advisory: cachefs can be evicted.
function cacheDescription() as String
    fs = CreateObject("roFileSystem")
    used = 0
    files = fs.Find("cachefs:/", "^a-")
    if files <> invalid
        for each name in files
            stat = fs.Stat("cachefs:/" + name)
            if stat <> invalid and stat.size <> invalid then used = used + stat.size
        end for
    end if
    out = (used / 1048576).ToStr() + " MB in spots"
    info = fs.GetVolumeInfo("cachefs:")
    if info <> invalid and info.blocks <> invalid and info.blocksize <> invalid
        total = info.blocks * info.blocksize / 1048576
        free = 0
        if info.freeblocks <> invalid then free = info.freeblocks * info.blocksize / 1048576
        out = out + ", " + Int(free).ToStr() + " of " + Int(total).ToStr() + " MB free"
    end if
    return out
end function

' The one line that says whether this TV is talking to a server at all, and
' when it will next do so. It is the first thing to read when a menu change
' has not landed.
function pollingDescription() as String
    url = m.top.launchRemoteUrl
    if url = ""
        section = CreateObject("roRegistrySection", "adbite")
        if section.Exists("remoteUrl") then url = section.Read("remoteUrl")
    end if
    if url = "" and m.config <> invalid then url = strOrDefault(m.config.remoteUrl, "")
    if url = "" and m.config <> invalid then url = strOrDefault(m.config.syncUrl, "")
    if url = "" then return "nothing — this is the board inside the package"

    when = "off"
    if m.nextRefreshAt > 0
        remaining = Int((m.nextRefreshAt - nowSeconds()) / 60)
        if remaining < 0 then remaining = 0
        if remaining >= 60
            when = "next in about " + Int(remaining / 60).ToStr() + "h " + (remaining mod 60).ToStr() + "m"
        else
            when = "next in " + remaining.ToStr() + "m"
        end if
    end if

    return url + "  (" + when + ")"
end function

function joinLines(lines as Object) as String
    out = ""
    for each line in lines
        if out <> "" then out = out + Chr(10)
        out = out + line
    end for
    return out
end function

' ---- small helpers --------------------------------------------------------

function strOrDefault(value as Dynamic, fallback as String) as String
    if value = invalid then return fallback
    if type(value) = "roString" or type(value) = "String" then return value
    return fallback
end function

function numOrDefault(value as Dynamic, fallback as Float) as Float
    if value = invalid then return fallback
    kind = type(value)
    if kind = "roInt" or kind = "Integer" or kind = "roFloat" or kind = "Float" or kind = "Double" or kind = "roDouble" then return value
    return fallback
end function

function clamp(value as Float, low as Float, high as Float) as Float
    if value < low then return low
    if value > high then return high
    return value
end function
