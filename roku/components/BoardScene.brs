sub init()
    m.backdrop = m.top.findNode("backdrop")
    m.menu = m.top.findNode("menu")
    m.ads = m.top.findNode("ads")
    m.diagnostics = m.top.findNode("diagnostics")
    m.diagText = m.top.findNode("diagText")
    m.pairing = m.top.findNode("pairing")
    m.tip = m.top.findNode("tip")
    m.whichWayUp = m.top.findNode("whichWayUp")
    m.wayBg = m.top.findNode("wayBg")
    m.wayArrow = m.top.findNode("wayArrow")
    m.pairingCard = m.top.findNode("pairingCard")
    m.tipCard = m.top.findNode("tipCard")
    m.stage = m.top.findNode("stage")
    m.stageBg = m.top.findNode("stageBg")
    m.stagePosterWrap = m.top.findNode("stagePosterWrap")
    m.stagePoster = m.top.findNode("stagePoster")
    m.stageVideo = m.top.findNode("stageVideo")
    m.stageVideo.observeField("state", "onStageVideoState")
    m.stageItems = []
    m.stageAt = -1
    ' The rotation this list represents, so a revision bump that changes
    ' nothing about the media does not rewind the wall to its first frame.
    m.stageKey = ""
    ' A which-way-up asked for at launch, before there was a board to ask of.
    m.pendingHang = ""
    m.stageTimer = m.top.createChild("Timer")
    m.stageTimer.repeat = false
    m.stageTimer.observeField("fire", "stageAdvance")
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
    ' A Roku has one video decoder worth relying on, and a full-screen spot
    ' covers the stage anyway. The stage stands down while a spot has it and
    ' picks the clip up again afterwards.
    m.ads.observeField("playingVideo", "onAdVideo")

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

    ' A board arriving from the server, the cache or the package carries the
    ' shop's answer to which way up this screen is. If somebody has stood in
    ' front of this one and said otherwise, theirs wins until the server has
    ' caught up — otherwise the next poll would visibly undo what they just
    ' did, which is the fastest way to teach somebody a control is broken.
    said = storedWayUp()
    if said <> invalid and config.board <> invalid
        config.board.orientation = said.orientation
        config.board.turn = said.turn
    end if

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
        ' A hang= handed in at launch, now that there is a board to hang.
        if m.pendingHang <> invalid and m.pendingHang <> ""
            want = m.pendingHang
            m.pendingHang = ""
            applyHang(want)
        end if
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
    ' A board with a stage clip hides the menu for a different reason: there
    ' is film where the list would be, and it is still this shop's board.
    items = stageList()
    m.menu.visible = not (m.config.supplemental = true or items.count() > 0)

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

    placeStage(items, canvas, m.menu.paneWidth, m.menu.paneHeight)

    ' The cards carry the only two instructions this product ever gives a
    ' shop — the pairing code, and how to switch the screensaver off. On a
    ' screen hung on its end they were drawn across the frame while the board
    ' behind them was upright, so the one thing a shop had to read was the
    ' one thing lying on its side.
    turnOverlay(m.pairingCard, canvas)
    turnOverlay(m.tipCard, canvas)
    layoutWhichWayUp()

    m.menu.slotId = m.slotId
    m.menu.config = m.config
    m.ads.config = m.config

    m.revision = m.revision + 1
    m.menu.revision = m.revision
    m.ads.revision = m.revision
end sub

' Which way up, handed in at launch rather than pressed on a remote.
'
' "show" opens the card; the three answers set it outright and leave the
' board on screen. Exists because a Roku TV with "Control by mobile apps"
' switched off refuses every ECP key press, and on such a set the OPTIONS
' overlay -- and therefore the card behind it -- cannot be reached at all.
sub onLaunchDiag()
    if LCase(strOrDefault(m.top.launchDiag, "")).Trim() = "" then return
    m.diagnostics.visible = true
    m.ads.hold = true
    refreshDiagnostics()
end sub

sub onLaunchHang()
    want = LCase(strOrDefault(m.top.launchHang, "")).Trim()
    if want = "" then return

    ' The field is set from Main, which happens before ConfigTask has been
    ' anywhere. Acting now would read the orientation off a board that is not
    ' there yet: the card would say "Landscape" on a portrait screen, and a
    ' hang= would be written against nothing. Held until there is a board.
    if m.config = invalid or m.config.board = invalid
        m.pendingHang = want
        return
    end if
    applyHang(want)
end sub

sub applyHang(want as String)
    if want = "show"
        showWhichWayUp()
        return
    end if

    states = wayStates()
    at = -1
    if want = "landscape" then at = 0
    if want = "left" or want = "portrait-left" then at = 1
    if want = "right" or want = "portrait-right" then at = 2
    if at < 0
        print "[adbite] unknown hang '"; want; "'"
        return
    end if

    ' turnWhichWayUp() walks from where the board is, so the distance is the
    ' difference between the two. Going through it rather than around it
    ' keeps one place that writes the registry and tells the server.
    turnWhichWayUp(at - wayIndex())
    print "[adbite] hung "; wayLabel()
end sub

' ---- which way up ---------------------------------------------------------
'
' The one question about a screen that cannot sensibly be answered anywhere
' but in front of it. The dashboard asks a shop whether the TV's top edge is
' now on their left or their right, which is a puzzle in a browser and
' obvious on a wall: this draws an arrow in the board's own space, so it
' points at the ceiling exactly when the setting is right, and LEFT/RIGHT
' cycle until it does.
'
' The answer is the screen's, not the shop's. It is written to the device
' registry at once so a reboot keeps it, and handed to the sync task so the
' server writes it against this device rather than against the board — a shop
' with a counter board and a portrait screen beside the till has two answers,
' and one remote must not turn both.

sub showWhichWayUp()
    m.whichWayUp.visible = true
    m.ads.hold = true
    layoutWhichWayUp()
end sub

sub hideWhichWayUp()
    if not m.whichWayUp.visible then return
    m.whichWayUp.visible = false
    m.ads.hold = m.diagnostics.visible
end sub

' The three answers there are, in the order LEFT and RIGHT walk them.
function wayStates() as Object
    return [
        { orientation: "landscape", turn: "" },
        { orientation: "portrait", turn: "left" },
        { orientation: "portrait", turn: "right" }
    ]
end function

function wayIndex() as Integer
    board = invalid
    if m.config <> invalid then board = m.config.board
    orientation = "landscape"
    turn = "left"
    if board <> invalid
        orientation = LCase(strOrDefault(board.orientation, "landscape"))
        turn = LCase(strOrDefault(board.turn, "left"))
    end if
    if orientation <> "portrait" then return 0
    if turn = "right" then return 2
    return 1
end function

' `step` is reserved in BrightScript, hence `by`.
sub turnWhichWayUp(by as Integer)
    if m.config = invalid or m.config.board = invalid then return
    states = wayStates()
    at = (wayIndex() + by + states.count()) mod states.count()
    chosen = states[at]

    m.config.board.orientation = chosen.orientation
    if chosen.orientation = "portrait"
        m.config.board.turn = chosen.turn
    else
        m.config.board.turn = "left"
    end if

    ' Kept on the device so a reboot before the next sync does not lose it,
    ' and read back by applyBoard() so a freshly fetched board is hung the way
    ' this screen actually is.
    section = CreateObject("roRegistrySection", "adbite")
    section.Write("orientation", chosen.orientation)
    section.Write("turn", chosen.turn)
    section.Flush()

    ' Told to the server on the next poll, against this device.
    m.loader.screen = { orientation: chosen.orientation, turn: chosen.turn }

    layout()
    layoutWhichWayUp()
    refreshDiagnostics()
end sub

' What this screen has been told about itself, for a board that has just
' arrived from the server or out of the package.
function storedWayUp() as Object
    section = CreateObject("roRegistrySection", "adbite")
    if not section.Exists("orientation") then return invalid
    orientation = section.Read("orientation")
    turn = "left"
    if section.Exists("turn") then turn = section.Read("turn")
    if turn <> "right" then turn = "left"
    if orientation <> "portrait" then orientation = "landscape"
    return { orientation: orientation, turn: turn }
end function

sub layoutWhichWayUp()
    if not m.whichWayUp.visible then return

    board = invalid
    if m.config <> invalid then board = m.config.board
    canvas = CanvasFor(board)
    W = canvas.width
    H = canvas.height

    ' The card is drawn on the canvas and turned into the frame, exactly as
    ' the menu is. That is the whole trick: if the board is hung the way the
    ' setting says, this reads upright.
    if canvas.turn = ""
        m.whichWayUp.rotation = 0
        m.whichWayUp.translation = [0, 0]
    else
        placed = PortraitTransform(canvas.turn, 0, 0)
        m.whichWayUp.rotation = placed.rotation
        m.whichWayUp.translation = placed.translation
    end if

    m.wayBg.width = W
    m.wayBg.height = H

    theme = BoardTheme("chalk")
    if m.config <> invalid then theme = BoardPalette(m.config)

    ' Everything is sized off the shorter side, because this card is drawn on
    ' both a 1080-wide canvas and a 1080-tall one. Sizing off the width alone
    ' fitted the portrait board and ran the help text off the bottom of a
    ' landscape one, which is the half nobody would have thought to check.
    unit = W
    if H < unit then unit = H

    arrow = Int(unit * 0.30)
    titleSize = Int(unit * 0.050)
    nowSize = Int(unit * 0.038)
    helpSize = Int(unit * 0.030)
    helpHeight = Int(helpSize * 2.6)
    gap = Int(unit * 0.035)

    ' Stacked, then the whole stack centred, so it sits right on a canvas of
    ' any shape rather than at a fraction of a height that only suits one.
    stack = arrow + gap + titleSize + Int(gap * 0.6) + nowSize + gap + helpHeight
    top = (H - stack) / 2
    pad = Int(W * 0.06)

    m.wayArrow.width = arrow
    m.wayArrow.height = arrow
    m.wayArrow.translation = [(W - arrow) / 2, top]
    m.wayArrow.blendColor = theme.accent

    y = top + arrow + gap

    title = m.top.findNode("wayTitle")
    title.font = BoardFont(titleSize, true)
    title.width = W - pad * 2
    title.translation = [pad, y]
    title.text = "This arrow should point at the ceiling"

    y = y + titleSize + Int(gap * 0.6)

    now = m.top.findNode("wayNow")
    now.font = BoardFont(nowSize, false)
    now.width = W - pad * 2
    now.translation = [pad, y]
    now.text = wayLabel()

    y = y + nowSize + gap

    help = m.top.findNode("wayHelp")
    help.font = BoardFont(helpSize, false)
    help.width = W - pad * 2
    help.height = helpHeight
    help.wrap = true
    help.translation = [pad, y]
    help.text = "LEFT and RIGHT turn the board until it does. OK keeps it." + Chr(10) + "This screen only — your other TVs are not changed."
end sub

function wayLabel() as String
    at = wayIndex()
    if at = 0 then return "Landscape · hung the usual way round"
    if at = 1 then return "Portrait · top edge to your left"
    return "Portrait · top edge to your right"
end function

' ---- cards over a turned board --------------------------------------------

' A card laid out for a 1920x1080 frame, put upright on whatever canvas the
' board is using.
'
' Rather than re-laying every label against a portrait canvas, the card keeps
' its design and is scaled to the canvas's width and turned with it: a 1920
' wide card on a 1080 wide canvas is drawn at 0.5625 and centred. The card is
' the same shape relative to the screen either way, which is what makes one
' set of translations correct for both.
'
' The scrim behind it is left alone on purpose. It is a flat rectangle over
' the whole frame and looks identical whichever way it is turned.
' A panel small enough to fit the canvas as drawn: turned into the frame,
' never scaled. turnOverlay() below shrinks a full-frame card to fit; this is
' for something that is already the right size and only in the wrong
' direction, where scaling would cost legibility for nothing. `offset` is
' where the panel sits in canvas space.
sub turnPanel(node as Object, canvas as Object, offsetX as Float, offsetY as Float)
    if node = invalid then return
    if canvas.turn = ""
        node.rotation = 0
        node.translation = [offsetX, offsetY]
        return
    end if
    placed = PortraitTransform(canvas.turn, offsetX, offsetY)
    node.rotation = placed.rotation
    node.translation = placed.translation
end sub

sub turnOverlay(card as Object, canvas as Object)
    if card = invalid then return

    if canvas.turn = ""
        card.scale = [1.0, 1.0]
        card.rotation = 0
        card.translation = [0, 0]
        return
    end if

    scale = canvas.width / 1920.0
    ' Centred down the long axis of the canvas, in canvas coordinates.
    offsetY = (canvas.height - 1080.0 * scale) / 2.0
    placed = PortraitTransform(canvas.turn, 0, offsetY)

    ' Scale and rotation are both about the node's origin, which is what
    ' PortraitTransform's translations were derived for.
    card.scaleRotateCenter = [0, 0]
    card.scale = [scale, scale]
    card.rotation = placed.rotation
    card.translation = placed.translation
end sub

' ---- the stage -----------------------------------------------------------
'
' The shop's own media, where a menu board would have its menu.
'
' This is the shape most screens are: no prices, the shop's film on a loop,
' and the strip along the foot is the part that was sold. So the stage is a
' pane in the board's layout, not the full-screen takeover an ad buys — the
' strip keeps running underneath it the whole time.

' The rotation, with every src already resolved to something the device can
' open. Empty on a menu board.
function stageList() as Object
    out = []
    if m.config = invalid then return out
    items = m.config.stage
    if items = invalid or type(items) <> "roArray" then return out
    for each item in items
        src = strOrDefault(item.src, "").Trim()
        if src <> ""
            entry = {}
            entry.append(item)
            entry.src = resolveSrc(src, m.config)
            entry.kind = LCase(strOrDefault(item.kind, "video"))
            out.push(entry)
        end if
    end for
    return out
end function

' Where the stage sits in the frame.
'
' MenuPane draws in canvas coordinates and is rotated into the frame, but a
' Roku will not rotate video, so the stage has to be given the pane's rect
' already mapped through the turn — and a clip for a turned screen has to
' have been rotated the same way before it was packaged. The rect is the menu
' pane's, so the stage ends exactly where the sold strip begins.
function stageRect(canvas as Object, paneW as Float, paneH as Float) as Object
    if canvas.turn = "left"
        ' (x, y) -> (1920 - y, x)
        return { x: 1920 - paneH, y: 0, width: paneH, height: paneW }
    else if canvas.turn = "right"
        ' (x, y) -> (y, 1080 - x)
        return { x: 0, y: 1080 - paneW, width: paneH, height: paneW }
    end if
    return { x: 0, y: 0, width: paneW, height: paneH }
end function

' What the rotation is, so that a poll which changed a price does not restart
' the film. Ids and order both count; a reordered list is a different wall.
function stageKeyOf(items as Object) as String
    key = ""
    for each item in items
        key = key + strOrDefault(item.id, item.src) + "|"
    end for
    return key
end function

sub placeStage(items as Object, canvas as Object, paneW as Float, paneH as Float)
    if items.count() = 0
        stopStage()
        return
    end if

    ' The plate and the video are placed in the frame, because the video
    ' cannot be turned and the plate has no orientation to speak of.
    rect = stageRect(canvas, paneW, paneH)
    m.stage.translation = [0, 0]
    m.stageBg.translation = [rect.x, rect.y]
    m.stageBg.width = rect.width
    m.stageBg.height = rect.height
    m.stageVideo.translation = [rect.x, rect.y]
    m.stageVideo.width = rect.width
    m.stageVideo.height = rect.height

    ' The still is drawn in canvas space and turned into the frame, the way
    ' MenuPane is. The pane always starts at the canvas origin, so this is
    ' the same transform the menu gets.
    if canvas.turn = ""
        m.stagePosterWrap.rotation = 0
        m.stagePosterWrap.translation = [0, 0]
    else
        placed = PortraitTransform(canvas.turn, 0, 0)
        m.stagePosterWrap.rotation = placed.rotation
        m.stagePosterWrap.translation = placed.translation
    end if
    m.stagePoster.translation = [0, 0]
    m.stagePoster.width = paneW
    m.stagePoster.height = paneH

    m.stage.visible = true

    key = stageKeyOf(items)
    m.stageItems = items
    if key = m.stageKey then return

    ' A new rotation starts at the top; the old one is not resumed, because
    ' its index means nothing in a list that changed underneath it.
    m.stageKey = key
    m.stageAt = -1
    stageAdvance()
end sub

sub stopStage()
    if m.stageKey <> ""
        m.stageTimer.control = "stop"
        m.stageVideo.control = "stop"
        m.stageVideo.content = invalid
        m.stagePoster.uri = ""
        m.stageItems = []
        m.stageAt = -1
        m.stageKey = ""
    end if
    m.stage.visible = false
end sub

sub stageAdvance()
    m.stageTimer.control = "stop"
    if m.stageItems.count() = 0 then return
    ' A spot with the wall does not want the stage competing for the decoder,
    ' and it is covering the stage anyway. Picked up again in onAdVideo().
    if m.ads.playingVideo then return

    m.stageAt = (m.stageAt + 1) mod m.stageItems.count()
    item = m.stageItems[m.stageAt]

    if item.kind = "image"
        m.stageVideo.control = "stop"
        m.stageVideo.visible = false
        m.stagePoster.uri = item.src
        m.stagePoster.visible = true
        stageReport(item)
        m.stageTimer.duration = stageSeconds(item)
        m.stageTimer.control = "start"
        return
    end if

    content = CreateObject("roSGNode", "ContentNode")
    content.url = item.src
    content.streamFormat = videoFormatFor(item.src)
    content.title = strOrDefault(item.name, "")

    ' One clip on its own is handed to the player to repeat, which rewinds
    ' without re-opening the file; a rotation of one would otherwise show a
    ' black frame every time it came round.
    m.stageVideo.loop = (m.stageItems.count() = 1)
    m.stageVideo.visible = true
    m.stageVideo.content = content
    m.stageVideo.control = "play"

    ' The poster stays up under the video until the stream reports playing,
    ' so the handover is the last frame of the still rather than black.
    ' A wedged stream must not park the wall, so the clock runs behind it.
    m.stageTimer.duration = stageSeconds(item) + 10
    m.stageTimer.control = "start"
end sub

sub onStageVideoState()
    state = m.stageVideo.state
    if state = "playing"
        m.stagePoster.visible = false
        if m.stageAt >= 0 and m.stageAt < m.stageItems.count()
            stageReport(m.stageItems[m.stageAt])
        end if
    else if state = "finished" or state = "error"
        if state = "error" then print "[adbite] stage clip failed: "; m.stageVideo.content.url
        ' A single looping clip never finishes; anything else hands over.
        if m.stageItems.count() > 1 then stageAdvance()
    end if
end sub

function stageSeconds(item as Object) as Integer
    seconds = Int(numOrDefault(item.seconds, 8))
    if seconds < 2 then seconds = 2
    return seconds
end function

' The shop's own media is billed to nobody, but it is still what was on the
' wall, and the dashboard shows a shop what its own screen played. The server
' knows an id that is not a campaign id and does not invoice it.
sub stageReport(item as Object)
    id = strOrDefault(item.id, "")
    if id = "" then return
    now = CreateObject("roDateTime")
    print "[adbite] stage played media-"; id
    m.pendingPlays.Push({ id: "media-" + id, at: now.ToISOString(), seconds: stageSeconds(item) })
end sub

sub onAdVideo()
    if m.stageKey = "" then return
    if m.ads.playingVideo
        m.stageTimer.control = "stop"
        m.stageVideo.control = "stop"
    else
        ' Back from a takeover: pick the rotation up at the next piece rather
        ' than resuming a clip the spot cut off part way through.
        stageAdvance()
    end if
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
    ' No roFileSystem here. It comes back invalid in the render thread on
    ' some sets -- a Hisense 43H4030 among them -- and a dot operator on that
    ' takes the whole key handler down with it, which is what used to happen
    ' to the one button a Store reviewer is told to press. ReadAsciiFile
    ' answers "" for a file that is not there, which is all this needed.
    raw = ReadAsciiFile("pkg:/demo-board.json")
    if raw = invalid then return invalid
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

    ' Every key the channel is actually handed. A Roku TV can keep some of
    ' them for itself -- the * button is the system's own options panel on
    ' several models -- and the difference between "the channel ignored it"
    ' and "the channel never saw it" is not otherwise visible from here.
    print "[adbite] key "; key

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

    ' The card owns the remote while it is up.
    if m.whichWayUp.visible
        if key = "left"
            turnWhichWayUp(-1)
            return true
        end if
        if key = "right"
            turnWhichWayUp(1)
            return true
        end if
        if key = "OK" or key = "back" or key = "options"
            hideWhichWayUp()
            return true
        end if
        return true
    end if

    ' Reached from the overlay rather than from a bare key press, so that a
    ' customer leaning on a remote cannot turn a shop's board over.
    if key = "up" and m.diagnostics.visible
        m.diagnostics.visible = false
        showWhichWayUp()
        return true
    end if

    ' `replay` as well as `options`, because on a Roku TV the * button is the
    ' television's own options panel and the set may keep it -- which would
    ' otherwise leave the overlay, and the device IP printed on it, with no
    ' way in on exactly the hardware a shop has on the wall.
    if key = "options" or key = "info" or key = "replay"
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

    ' The overlay carries the device IP and the channel version, which is
    ' what somebody standing at the TV has come to read. On a screen hung on
    ' its end it was drawn across the frame while the board behind it was
    ' upright, so the one panel whose whole job is to be read was sideways.
    board = invalid
    if m.config <> invalid then board = m.config.board
    canvas = CanvasFor(board)
    ' 72 from the corner on a board with room for it; centred on one without,
    ' since the panel is 1000 wide and a portrait canvas is 1080.
    inset = 72
    spare = (canvas.width - 1000) / 2
    if spare < inset then inset = spare
    if inset < 0 then inset = 0
    turnPanel(m.diagnostics, canvas, inset, 72)

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
        "UP: which way is this screen hung?",
        "REPLAY also opens this, if * belongs to the TV",
        "OPTIONS hides this  ·  PLAY syncs now"
    ]

    m.diagText.font = BoardFont(26, false)
    m.diagText.color = &hFFFFFFFF
    m.diagText.text = joinLines(lines)
end sub

' How much of the device's cache the spots are using, and what is left. On a
' Roku the answer to "what is left" is advisory: cachefs can be evicted.
' What the cache holds, as the loader last measured it.
'
' This used to read the disk here. roFileSystem returns invalid in the render
' thread on some sets, and the unguarded dot operator that followed threw out
' of onKeyEvent -- so the overlay never opened, the key was never marked
' handled, and it fell through to the television's own options panel. The
' answer looked like "the TV keeps the * button". It was our own crash.
'
' The loader reads the disk from its Task thread, where it works, and hands
' the figures over.
function cacheDescription() as String
    state = invalid
    if m.loader <> invalid then state = m.loader.cacheState
    if state = invalid or state.usedMb = invalid then return "not measured yet"

    out = Int(state.usedMb).ToStr() + " MB in spots"
    if state.files <> invalid then out = Int(state.files).ToStr() + " file(s), " + out
    if state.freeMb <> invalid and state.totalMb <> invalid
        out = out + ", " + Int(state.freeMb).ToStr() + " of " + Int(state.totalMb).ToStr() + " MB free"
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
