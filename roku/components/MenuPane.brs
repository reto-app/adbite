' ---- the size table -------------------------------------------------------
' One `cqw` is 19.2px on a 1920-wide board. These are the figures from
' `.board-*` in app/globals.css, resolved once here so the two renderings of
' the same board cannot drift apart by a rounding.
'
' They live on `m` rather than in `const`, which is BrighterScript and not a
' keyword the device understands.

sub loadSizes()
    m.SZ = {
        padX: 72          ' wider than the web's 3cqw: TV overscan eats 3%
        padTop: 64
        padBottom: 56
        colGap: 58        ' 3cqw

        shop: 65          ' 3.4cqw
        tagline: 26       ' 1.35cqw
        slot: 24          ' 1.25cqw
        section: 33       ' 1.7cqw
        item: 29          ' 1.5cqw
        note: 22          ' 1.15cqw
        price: 31         ' 1.6cqw
        badge: 18         ' 0.95cqw
        quote: 24         ' 1.25cqw
        cite: 21          ' 1.1cqw

        lineItem: 36      ' 1.25 line-height on the item size
        lineNote: 29      ' 1.3 on the note size
        gapItem: 11       ' 0.55cqw
        gapTitle: 13      ' 0.7cqw
        gapSection: 35    ' 1.8cqw

        sectionPic: 134  ' 7cqw, the photo above a section in the flowed layout
        headH: 118       ' name, tagline, and the rule under them
        reviewH: 62
        slotW: 260       ' the day-part label in the header
    }
end sub

' The table above is for a 1920-wide board. A TV hung on its end is a
' 1080-wide board, and the dashboard's preview sizes everything by the width
' of the board (`cqw`), so the wall does too: every figure shrinks by the
' same ratio and the fit pass then grows the menu back to fill the height.
sub sizeForCanvas(canvasWidth as Float)
    loadSizes()
    if canvasWidth <= 0 or canvasWidth >= 1920 then return
    ratio = canvasWidth / 1920
    for each key in m.SZ
        m.SZ[key] = Int(m.SZ[key] * ratio)
    end for
end sub

sub init()
    loadSizes()
    m.theme = BoardTheme("chalk")
    m.scale = 1.0
    m.columns = 2

    m.bg = m.top.createChild("Rectangle")
    m.body = m.top.createChild("Group")

    m.reviewTimer = m.top.createChild("Timer")
    m.reviewTimer.repeat = true
    m.reviewTimer.observeField("fire", "nextReview")

    m.reviews = []
    m.reviewIndex = 0

    ' A measuring stick. Kept out of the body so a redraw does not destroy it,
    ' and at zero opacity because it is never meant to be read.
    m.ruler = m.top.createChild("Label")
    m.ruler.opacity = 0
end sub

sub redraw()
    config = m.top.config
    if config = invalid or config.board = invalid then return

    board = config.board
    m.theme = BoardPalette(config)

    ' The shop's own lettering, if the two files landed. Before anything asks
    ' for a font, because SetBoardFaces() empties the size cache and a font
    ' handed out before it would be cut from the old face.
    SetBoardFaces(BoardFace(config, "display", true), BoardFace(config, "body", false))

    ' url -> cachefs: path for every picture the board names. ConfigTask has
    ' already downloaded and verified them; anything missing from this map is a
    ' picture that did not land, and the board is drawn without it.
    m.pictures = {}
    if config.pictures <> invalid and type(config.pictures) = "roArray"
        for each picture in config.pictures
            local = strOr(picture.src, "")
            if local <> "" and Left(LCase(local), 4) <> "http"
                m.pictures[strOr(picture.url, "")] = local
            end if
        end for
    end if

    W = m.top.paneWidth
    H = m.top.paneHeight
    m.bg.width = W
    m.bg.height = H
    m.bg.color = m.theme.bg

    ' A portrait board is one column, as the dashboard draws it: two columns
    ' on a 1080-wide board leave neither wide enough for a dish and its price.
    sizeForCanvas(m.top.canvasWidth)
    m.columns = 2
    if m.top.canvasWidth < 1400 then m.columns = 1

    ' The review labels are about to be destroyed with the rest of the body,
    ' so the rotation has to stop before it fires at a removed node.
    m.reviewTimer.control = "stop"
    m.reviews = []
    m.quote = invalid
    m.body.removeChildrenIndex(m.body.getChildCount(), 0)

    sections = sectionsFor(board, m.top.slotId)

    ' A board the shop placed by hand is drawn from its blocks. There is no
    ' fit pass and no column balancing: the shop said where everything goes,
    ' and second-guessing that on the wall is how the preview stops being a
    ' preview. Everything after this line is the automatic layout.
    blocks = layoutFor(board, m.top.slotId)
    if blocks.count() > 0
        drawPlaced(board, blocks, W, H)
        return
    end if

    m.priceChars = longestPrice(sections)
    colWidth = (W - m.SZ.padX - m.SZ.padX + m.SZ.colGap) / 2 - m.SZ.colGap
    if m.columns = 1 then colWidth = W - m.SZ.padX - m.SZ.padX
    if colWidth < 200 then colWidth = 200

    hasReview = drawableReviews(board).count() > 0
    top = m.SZ.padTop + m.SZ.headH + 31
    bottom = H - m.SZ.padBottom
    if hasReview then bottom = bottom - m.SZ.reviewH
    available = bottom - top

    m.scale = fitScale(sections, available, colWidth)

    ' A menu that still will not fit at the floor gets the review bar's strip
    ' as well. The quote is garnish; the prices are the job.
    if hasReview and tallestColumn(sections) > available
        hasReview = false
        bottom = H - m.SZ.padBottom
        available = bottom - top
        m.scale = fitScale(sections, available, colWidth)
    end if

    drawHeader(board, W)
    drawColumns(sections, colWidth, top, available)
    if hasReview then drawReviews(board, W, bottom)
end sub

' ---- the header -----------------------------------------------------------

sub drawHeader(board as Object, W as Float)
    ' The shop's mark, to the left of its name, at the height of the name
    ' itself. Square because that is the box the editor draws it in; a wide
    ' wordmark comes out letterboxed in it rather than cropped, which is the
    ' failure a shop can see and fix by cropping the file.
    left = m.SZ.padX
    logo = pictureFor(strOr(board.logo, ""))
    if logo <> ""
        size = m.SZ.shop + 8
        poster = m.body.createChild("Poster")
        poster.uri = logo
        poster.width = size
        poster.height = size
        poster.loadDisplayMode = "scaleToFit"
        poster.translation = [m.SZ.padX, m.SZ.padTop]
        left = m.SZ.padX + size + 20
    end if

    name = m.body.createChild("Label")
    name.text = strOr(board.shopName, "Your shop")
    name.font = BoardFont(m.SZ.shop, true)
    name.color = m.theme.ink
    name.translation = [left, m.SZ.padTop]
    name.width = W - left - m.SZ.padX - m.SZ.slotW
    name.height = m.SZ.shop + 8
    name.wrap = false
    name.vertAlign = "bottom"

    slot = m.body.createChild("Label")
    slot.text = UCase(slotLabel())
    slot.font = BoardFont(m.SZ.slot, true)
    slot.color = m.theme.accent
    slot.translation = [W - m.SZ.padX - m.SZ.slotW, m.SZ.padTop]
    slot.width = m.SZ.slotW
    slot.height = m.SZ.shop + 8
    slot.horizAlign = "right"
    slot.vertAlign = "bottom"

    tagline = strOr(board.tagline, "")
    if tagline <> ""
        line = m.body.createChild("Label")
        line.text = tagline
        line.font = BoardFont(m.SZ.tagline, false)
        line.color = m.theme.dim
        line.translation = [left, m.SZ.padTop + m.SZ.shop + 12]
        line.width = W - left - m.SZ.padX
        line.height = m.SZ.tagline + 6
        line.wrap = false
    end if

    rule = m.body.createChild("Rectangle")
    rule.translation = [m.SZ.padX, m.SZ.padTop + m.SZ.headH + 14]
    rule.width = W - m.SZ.padX - m.SZ.padX
    rule.height = 2
    rule.color = m.theme.rule
end sub

function slotLabel() as String
    config = m.top.config
    if config.slotWindows <> invalid
        for each window in config.slotWindows
            if window.id = m.top.slotId then return strOr(window.label, m.top.slotId)
        end for
    end if
    return m.top.slotId
end function

' ---- the menu -------------------------------------------------------------

' CSS balances a two-column block; this does the same by filling the first
' column to the halfway mark of the total, never splitting a section.
sub drawColumns(sections as Object, colWidth as Float, top as Float, available as Float)
    heights = []
    total = 0
    for each section in sections
        h = sectionHeight(section)
        heights.push(h)
        total = total + h
    end for

    if sections.count() = 0
        blank = m.body.createChild("Label")
        blank.text = "Nothing on this board yet."
        blank.font = BoardFont(Int(28 * m.scale), false)
        blank.color = m.theme.dim
        blank.translation = [m.SZ.padX, top]
        return
    end if

    breakAt = balancePoint(heights)

    ' A five-item breakfast menu pinned to the top leaves the bottom half of
    ' the wall empty and reads as a screen that failed to finish loading.
    slack = available - tallestColumn(sections)
    if slack > 0 then top = top + slack / 2

    y = [top, top]

    for i = 0 to sections.count() - 1
        column = 0
        if i >= breakAt then column = 1

        x = m.SZ.padX
        if column = 1 then x = m.SZ.padX + colWidth + m.SZ.colGap

        drawSection(sections[i], x, y[column], colWidth)
        y[column] = y[column] + heights[i]
    end for
end sub

' The index of the first section in the right-hand column: whichever break
' leaves the taller of the two columns shortest. A section is never split.
function balancePoint(heights as Object) as Integer
    if m.columns = 1 then return heights.count()
    total = 0
    for each h in heights
        total = total + h
    end for

    best = 1
    bestTallest = total
    running = 0
    for i = 0 to heights.count() - 1
        running = running + heights[i]
        left = running
        right = total - running
        tallest = left
        if right > tallest then tallest = right
        if tallest < bestTallest
            bestTallest = tallest
            best = i + 1
        end if
    end for
    return best
end function

' The height a section's photo takes in the automatic layout, scaled with
' everything else. Zero when there is no photo, or when it did not download.
function sectionPictureHeight(section as Object) as Float
    if pictureFor(strOr(section.image, "")) = "" then return 0
    return Int(m.SZ.sectionPic * m.scale) + Int(m.SZ.gapTitle * m.scale)
end function

sub drawSection(section as Object, x as Float, y as Float, colWidth as Float)
    pictureH = sectionPictureHeight(section)
    if pictureH > 0
        poster = m.body.createChild("Poster")
        poster.uri = pictureFor(strOr(section.image, ""))
        poster.translation = [x, y]
        poster.width = colWidth
        poster.height = Int(m.SZ.sectionPic * m.scale)
        poster.loadDisplayMode = "scaleToZoom"
        y = y + pictureH
    end if

    title = m.body.createChild("Label")
    title.text = UCase(strOr(section.title, ""))
    title.font = BoardFont(Int(m.SZ.section * m.scale), true)
    title.color = m.theme.accent
    title.translation = [x, y]
    title.width = colWidth
    title.wrap = false

    cursor = y + Int(m.SZ.section * m.scale) + Int(m.SZ.gapTitle * m.scale)

    for each entry in drawableItems(section)
        cursor = drawItem(entry, x, cursor, colWidth)
    end for
end sub

function drawItem(entry as Object, x as Float, y as Float, colWidth as Float) as Float
    return drawItemInto(m.body, entry, x, y, colWidth)
end function

' One row of the menu, into whatever group is holding it: the pane for the
' automatic layout, a block's own group for a placed one.
function drawItemInto(parent as Object, entry as Object, x as Float, y as Float, colWidth as Float) as Float
    sold = strOr(entry.badge, "none") = "out"
    row = parent.createChild("Group")
    row.translation = [x, y]
    if sold then row.opacity = 0.4

    priceWidth = priceColumnWidth()
    nameWidth = colWidth - priceWidth - Int(16 * m.scale)

    badge = strOr(entry.badge, "none")
    lineHeight = Int(m.SZ.lineItem * m.scale)

    ' Built without a width so it sizes to its own text and can be measured.
    ' A Label with an explicit width reports that width back, not the string's.
    name = row.createChild("Label")
    name.text = strOr(entry.name, "")
    name.font = BoardFont(Int(m.SZ.item * m.scale), true)
    name.color = m.theme.ink
    name.wrap = false

    textWidth = measuredWidth(name, Len(strOr(entry.name, "")), Int(m.SZ.item * m.scale))

    if badge <> "none"
        gap = Int(16 * m.scale)
        pillWidth = badgeWidthFor(badge)
        ' The tag follows the name. It only falls back to the right edge of the
        ' column — truncating the name to make room — when the two together
        ' will not fit on the row.
        left = textWidth + gap
        if left + pillWidth > nameWidth
            left = nameWidth - pillWidth
            name.width = nameWidth - pillWidth - gap
        end if
        drawBadge(row, badge, left, lineHeight)
    else if textWidth > nameWidth
        name.width = nameWidth
    end if

    name.height = lineHeight
    name.vertAlign = "center"

    price = row.createChild("Label")
    price.text = strOr(entry.price, "")
    price.font = BoardFont(Int(m.SZ.price * m.scale), true)
    price.color = m.theme.ink
    price.translation = [colWidth - priceWidth, 0]
    price.width = priceWidth
    price.height = Int(m.SZ.lineItem * m.scale)
    price.horizAlign = "right"
    price.vertAlign = "center"

    height = Int(m.SZ.lineItem * m.scale)

    note = strOr(entry.note, "")
    if note <> ""
        line = row.createChild("Label")
        line.text = note
        line.font = BoardFont(Int(m.SZ.note * m.scale), false)
        line.color = m.theme.dim
        line.translation = [0, height]
        line.width = nameWidth
        line.height = Int(m.SZ.lineNote * m.scale)
        line.wrap = false
        height = height + Int(m.SZ.lineNote * m.scale)
    end if

    return y + height + Int(m.SZ.gapItem * m.scale)
end function

' The pill is sized from an estimate rather than a measurement: boundingRect()
' is only reliable once a node has been rendered, and these three words are
' short enough that a few pixels either side reads as padding. The label is
' centred so an over- or under-estimate stays symmetrical.
function badgeLabels() as Object
    return { new: "New", popular: "Popular", out: "Sold out" }
end function

function badgeWidthFor(badge as String) as Integer
    text = badgeLabels()[badge]
    if text = invalid then return 0
    size = Int(m.SZ.badge * m.scale)
    return Int(Len(text) * size * 0.70) + Int(24 * m.scale)
end function

' boundingRect() is exact but only once the node has been laid out, and it
' returns zero before that on some firmware. The fallback is a per-character
' average for the bold system face, which is close enough to place a tag.
function measuredWidth(label as Object, characters as Integer, size as Integer) as Float
    rect = label.boundingRect()
    if rect <> invalid and rect.width > 0 then return rect.width
    return characters * size * 0.60
end function

sub drawBadge(row as Object, badge as String, left as Float, lineHeight as Integer)
    text = badgeLabels()[badge]
    if text = invalid then return

    size = Int(m.SZ.badge * m.scale)
    width = badgeWidthFor(badge)
    height = Int(size * 1.7)
    if left < 0 then left = 0

    pill = row.createChild("Rectangle")
    pill.translation = [left, (lineHeight - height) / 2]
    pill.width = width
    pill.height = height
    if badge = "out"
        pill.color = m.theme.rule
    else
        pill.color = m.theme.accent
    end if

    label = row.createChild("Label")
    label.text = UCase(text)
    label.font = BoardFont(size, true)
    if badge = "out"
        label.color = m.theme.dim
    else
        label.color = m.theme.onAccent
    end if
    label.translation = [left, (lineHeight - height) / 2]
    label.width = width
    label.height = height
    label.horizAlign = "center"
    label.vertAlign = "center"
end sub

' ---- fitting --------------------------------------------------------------

function longestPrice(sections as Object) as Integer
    longest = 1
    for each section in sections
        for each entry in drawableItems(section)
            width = Len(strOr(entry.price, ""))
            if width > longest then longest = width
        end for
    end for
    return longest
end function

function priceColumnWidth() as Integer
    chars = 1
    if m.priceChars <> invalid then chars = m.priceChars
    width = Int(chars * m.SZ.price * m.scale * 0.62) + Int(16 * m.scale)
    minimum = Int(52 * m.scale)
    if width < minimum then return minimum
    return width
end function

function sectionHeight(section as Object) as Float
    h = sectionPictureHeight(section) + Int(m.SZ.section * m.scale) + Int(m.SZ.gapTitle * m.scale)
    for each entry in drawableItems(section)
        h = h + Int(m.SZ.lineItem * m.scale)
        if strOr(entry.note, "") <> "" then h = h + Int(m.SZ.lineNote * m.scale)
        h = h + Int(m.SZ.gapItem * m.scale)
    end for
    return h + Int(m.SZ.gapSection * m.scale)
end function

' A shop that adds a section should not have it fall off the bottom of the
' wall. Shrink the whole board until the taller column fits, down to a floor
' where the board stops being readable from the counter and clipping is the
' more honest failure.
' Shrink a long menu until it fits, and grow a short one until it fills the
' wall. The floor is where the board stops being readable from the counter and
' clipping becomes the more honest failure; the ceiling is where a five-item
' menu would start to look like a joke.
function fitScale(sections as Object, available as Float, colWidth as Float) as Float
    floorScale = 0.62

    ' Growing to fill the height is only safe up to the point where the longest
    ' item name still fits its column. Past that the board fills the wall by
    ' truncating half the menu, which is worse than the empty space it cured.
    ceilingScale = widthCeiling(sections, colWidth)
    if ceilingScale > 1.75 then ceilingScale = 1.75
    if ceilingScale < floorScale then ceilingScale = floorScale

    m.scale = 1.0
    tallest = tallestColumn(sections)
    if tallest <= 0
        m.scale = 1.0
        return 1.0
    end if

    scale = 1.0
    for attempt = 0 to 7
        m.scale = scale
        tallest = tallestColumn(sections)
        if tallest <= 0 then exit for

        ' 0.98 leaves a hair of slack so integer rounding inside sectionHeight
        ' cannot push the column back over the line on the next pass.
        wanted = scale * ((available / tallest) * 0.98)
        if wanted > ceilingScale then wanted = ceilingScale
        if wanted < floorScale then wanted = floorScale

        if Abs(wanted - scale) < 0.01
            scale = wanted
            exit for
        end if
        scale = wanted
    end for

    m.scale = scale
    return scale
end function

' The largest scale at which every row still fits across its column. Every
' term scales together, so the answer is one ratio per item rather than a
' search: colWidth over what the row needs at scale 1.
function widthCeiling(sections as Object, colWidth as Float) as Float
    gap = 16
    reserve = m.priceChars * m.SZ.price * 0.62 + 16 + gap

    ceiling = 99.0
    for each section in sections
        for each entry in drawableItems(section)
            text = strOr(entry.name, "")
            m.ruler.font = BoardFont(m.SZ.item, true)
            m.ruler.text = text
            needed = measuredWidth(m.ruler, Len(text), m.SZ.item) + reserve

            badge = strOr(entry.badge, "none")
            if badge <> "none"
                label = badgeLabels()[badge]
                if label <> invalid then needed = needed + Len(label) * m.SZ.badge * 0.70 + 24 + gap
            end if

            if needed > 0
                fits = colWidth / needed
                if fits < ceiling then ceiling = fits
            end if
        end for
    end for

    if ceiling = 99.0 then return 1.0
    return ceiling
end function

function tallestColumn(sections as Object) as Float
    total = 0
    heights = []
    for each section in sections
        h = sectionHeight(section)
        heights.push(h)
        total = total + h
    end for
    if heights.count() = 0 then return 0

    breakAt = balancePoint(heights)
    first = 0
    second = 0
    for i = 0 to heights.count() - 1
        if i < breakAt
            first = first + heights[i]
        else
            second = second + heights[i]
        end if
    end for

    if first > second then return first
    return second
end function

' ---- the review foot ------------------------------------------------------

sub drawReviews(board as Object, W as Float, bottom as Float)
    m.reviews = drawableReviews(board)
    m.reviewIndex = 0

    y = bottom + 6
    rule = m.body.createChild("Rectangle")
    rule.translation = [m.SZ.padX, y]
    rule.width = W - m.SZ.padX - m.SZ.padX
    rule.height = 2
    rule.color = m.theme.rule

    m.stars = m.body.createChild("Group")
    m.stars.translation = [m.SZ.padX, y + 18]
    m.starSize = 24

    m.quote = m.body.createChild("Label")
    m.quote.font = BoardFont(m.SZ.quote, false)
    m.quote.color = m.theme.ink
    m.quote.translation = [m.SZ.padX + 150, y + 16]
    m.quote.width = W - m.SZ.padX - m.SZ.padX - 150 - 300
    m.quote.height = m.SZ.quote + 10
    m.quote.wrap = false

    m.cite = m.body.createChild("Label")
    m.cite.font = BoardFont(m.SZ.cite, false)
    m.cite.color = m.theme.dim
    m.cite.translation = [W - m.SZ.padX - 300, y + 18]
    m.cite.width = 300
    m.cite.height = m.SZ.quote + 10
    m.cite.horizAlign = "right"
    m.cite.wrap = false

    showReview()

    m.reviewTimer.control = "stop"
    if m.reviews.count() > 1
        m.reviewTimer.duration = reviewSeconds()
        m.reviewTimer.control = "start"
    end if
end sub

sub nextReview()
    if m.reviews.count() < 2 then return
    m.reviewIndex = (m.reviewIndex + 1) mod m.reviews.count()
    showReview()
end sub

sub showReview()
    if m.reviews.count() = 0 or m.quote = invalid then return
    review = m.reviews[m.reviewIndex]

    stars = intOr(review.stars, 5)
    if stars < 1 then stars = 1
    if stars > 5 then stars = 5

    ' The foot of an automatic board is a fixed strip, so 24px is right there.
    ' A placed review block is whatever height the shop dragged it to, so it
    ' sets m.starSize and the stars follow.
    size = 24
    if m.starSize <> invalid then size = Int(m.starSize)
    if size < 10 then size = 10

    m.stars.removeChildrenIndex(m.stars.getChildCount(), 0)
    for i = 0 to stars - 1
        star = m.stars.createChild("Poster")
        star.uri = "pkg:/images/star.png"
        star.width = size
        star.height = size
        star.blendColor = m.theme.accent
        star.translation = [i * (size + 3), 0]
    end for
    m.quote.text = Chr(&h201C) + strOr(review.quote, "") + Chr(&h201D)

    author = strOr(review.author, "")
    source = strOr(review.source, "")
    if source <> "" and author <> ""
        m.cite.text = author + " " + Chr(&h00B7) + " " + source
    else
        m.cite.text = author + source
    end if
end sub

function reviewSeconds() as Float
    config = m.top.config
    if config <> invalid and config.reviewSeconds <> invalid
        seconds = intOr(config.reviewSeconds, 12)
        if seconds >= 3 then return seconds
    end if
    return 12
end function

' ---- a board placed by hand -----------------------------------------------
'
' The web editor lets a shop drag every piece of its board around a grid and
' drop it where it wants. `board.layouts[slotId]` is what comes back: a list
' of blocks, each a rectangle in grid cells plus whatever that kind of block
' needs. The grid itself comes down in `config.grid` rather than being
' repeated here, so lib/layout.ts stays the one place those numbers live.
'
' The cells are percentages of the menu's own box, not of the screen — the ad
' rail is drawn by BoardScene outside this pane, so a shop that moves its ad
' from the right rail to the bottom strip keeps its layout and the blocks just
' get a different shaped box. That is the same thing the web preview does,
' where .board-free is inside .board-menu's padding.
'
' Nothing is scaled to fit. A block that holds more menu than it has room for
' drops the rows that fall past its bottom edge, which is what `overflow:
' hidden` does in the preview, near enough: the preview would show half a row
' and this shows none of it, and half a price on a wall is worse than no row.

function layoutFor(board as Object, slotId as String) as Object
    if board.layouts = invalid then return []
    blocks = board.layouts[slotId]
    if blocks = invalid or type(blocks) <> "roArray" then return []
    return blocks
end function

function gridOf() as Object
    config = m.top.config
    cols = 24
    rows = 14
    if config <> invalid and config.grid <> invalid
        cols = intOr(config.grid.cols, cols)
        rows = intOr(config.grid.rows, rows)
    end if
    if cols < 1 then cols = 1
    if rows < 1 then rows = 1
    return { cols: cols, rows: rows }
end function

sub drawPlaced(board as Object, blocks as Object, W as Float, H as Float)
    grid = gridOf()
    boxX = m.SZ.padX
    boxY = m.SZ.padTop
    boxW = W - m.SZ.padX - m.SZ.padX
    boxH = H - m.SZ.padTop - m.SZ.padBottom
    if boxW < 1 or boxH < 1 then return

    cellW = boxW / grid.cols
    cellH = boxH / grid.rows

    ' The scale the fit loop would have set is fixed at 1 here and each block
    ' multiplies it by its own, which is exactly what --bk-scale does in the
    ' preview's stylesheet.
    m.scale = 1.0
    m.priceChars = longestPrice(sectionsFor(board, m.top.slotId))

    for each block in blocks
        x = boxX + numOr(block.x, 0) * cellW
        y = boxY + numOr(block.y, 0) * cellH
        w = numOr(block.w, 1) * cellW
        h = numOr(block.h, 1) * cellH
        if w >= 1 and h >= 1
            ' A block the shop turned is drawn into a group of its own that is
            ' rotated about the middle of the rectangle, which is what
            ' `transform: rotate()` does about the same centre in the preview.
            ' Everything inside then draws at 0,0 in its own square frame and
            ' knows nothing about the angle. Untouched blocks get no wrapper
            ' at all, so a board nobody turned renders exactly as before.
            turn = numOr(block.rotate, 0)
            if turn <> 0
                holder = m.body.createChild("Group")
                holder.translation = [x, y]
                holder.scaleRotateCenter = [w / 2, h / 2]
                ' SceneGraph turns anticlockwise in radians; the board's
                ' degrees are clockwise, which is the way CSS reads them.
                holder.rotation = -turn * 3.14159265 / 180.0
                was = m.body
                m.body = holder
                drawBlock(board, block, 0, 0, w, h)
                m.body = was
            else
                drawBlock(board, block, x, y, w, h)
            end if
        end if
    end for
end sub

sub drawBlock(board as Object, block as Object, x as Float, y as Float, w as Float, h as Float)
    kind = strOr(block.kind, "")
    scale = numOr(block.scale, 1.0)
    if scale < 0.4 then scale = 0.4
    if scale > 3.0 then scale = 3.0

    if kind = "head"
        drawPlacedHead(board, x, y, w, h, scale)
    else if kind = "section"
        drawPlacedSection(board, block, x, y, w, h, scale)
    else if kind = "text"
        drawPlacedText(block, x, y, w, h, scale)
    else if kind = "image" or kind = "logo"
        drawPlacedImage(board, block, x, y, w, h)
    else if kind = "reviews"
        drawPlacedReviews(board, x, y, w, h)
    end if
end sub

' The name band, in its own box rather than across the top of the screen.
sub drawPlacedHead(board as Object, x as Float, y as Float, w as Float, h as Float, scale as Float)
    group = m.body.createChild("Group")
    group.translation = [x, y]

    left = 0
    logo = pictureFor(strOr(board.logo, ""))
    if logo <> ""
        size = h * 0.6
        if size > w * 0.25 then size = w * 0.25
        if size > 8
            poster = group.createChild("Poster")
            poster.uri = logo
            poster.width = size
            poster.height = size
            poster.loadDisplayMode = "scaleToFit"
            poster.translation = [0, 0]
            left = size + Int(18 * scale)
        end if
    end if

    nameSize = Int(m.SZ.shop * scale)
    slotWidth = Int(m.SZ.slotW * scale)
    if slotWidth > w * 0.3 then slotWidth = Int(w * 0.3)

    name = group.createChild("Label")
    name.text = strOr(board.shopName, "Your shop")
    name.font = BoardFont(nameSize, true)
    name.color = m.theme.ink
    name.translation = [left, 0]
    name.width = w - left - slotWidth
    name.height = nameSize + Int(8 * scale)
    name.wrap = false

    slot = group.createChild("Label")
    slot.text = UCase(slotLabel())
    slot.font = BoardFont(Int(m.SZ.slot * scale), true)
    slot.color = m.theme.accent
    slot.translation = [w - slotWidth, 0]
    slot.width = slotWidth
    slot.height = nameSize + Int(8 * scale)
    slot.horizAlign = "right"
    slot.vertAlign = "bottom"

    tagline = strOr(board.tagline, "")
    if tagline <> ""
        line = group.createChild("Label")
        line.text = tagline
        line.font = BoardFont(Int(m.SZ.tagline * scale), false)
        line.color = m.theme.dim
        line.translation = [left, nameSize + Int(12 * scale)]
        line.width = w - left
        line.height = Int(m.SZ.tagline * scale) + 6
        line.wrap = false
    end if

    rule = group.createChild("Rectangle")
    rule.translation = [0, h - 2]
    rule.width = w
    rule.height = 2
    rule.color = m.theme.rule
end sub

sub drawPlacedSection(board as Object, block as Object, x as Float, y as Float, w as Float, h as Float, scale as Float)
    section = sectionById(board, strOr(block.sectionId, ""))
    if section = invalid then return

    group = m.body.createChild("Group")
    group.translation = [x, y]

    cursor = 0.0

    picture = pictureFor(strOr(section.image, ""))
    if picture <> ""
        pictureH = h * 0.32
        if pictureH > 8
            poster = group.createChild("Poster")
            poster.uri = picture
            poster.width = w
            poster.height = pictureH
            poster.loadDisplayMode = "scaleToZoom"
            poster.translation = [0, 0]
            cursor = pictureH + Int(14 * scale)
        end if
    end if

    titleSize = Int(m.SZ.section * scale)
    title = group.createChild("Label")
    title.text = UCase(strOr(section.title, ""))
    title.font = BoardFont(titleSize, true)
    title.color = m.theme.accent
    title.translation = [0, cursor]
    title.width = w
    title.wrap = false
    cursor = cursor + titleSize + Int(m.SZ.gapTitle * scale)

    ' m.scale is what drawItem() reads for its own sizes, so the block's scale
    ' goes through it and is put back afterwards — the next block is entitled
    ' to a different one.
    was = m.scale
    m.scale = scale
    for each entry in drawableItems(section)
        rowHeight = itemHeight(entry)
        ' The row that would hang out of the bottom of the box, and every row
        ' after it, is not drawn. See the note at the top of this section.
        if cursor + rowHeight > h then exit for
        cursor = drawItemInto(group, entry, 0, cursor, w)
    end for
    m.scale = was
end sub

sub drawPlacedText(block as Object, x as Float, y as Float, w as Float, h as Float, scale as Float)
    text = strOr(block.text, "")
    if text = "" then return

    label = m.body.createChild("Label")
    label.text = text
    label.color = m.theme.ink
    tone = strOr(block.tone, "ink")
    if tone = "dim" then label.color = m.theme.dim
    if tone = "accent" then label.color = m.theme.accent
    ' The accent tone is the display face in the preview, so it is here too.
    label.font = BoardFont(Int(m.SZ.item * scale * 1.1), tone = "accent")
    label.translation = [x, y]
    label.width = w
    label.height = h
    label.wrap = true
    label.vertAlign = "center"
    align = strOr(block.align, "left")
    if align = "center" then label.horizAlign = "center"
    if align = "right" then label.horizAlign = "right"
end sub

sub drawPlacedImage(board as Object, block as Object, x as Float, y as Float, w as Float, h as Float)
    src = strOr(block.src, "")
    ' A logo block with no picture of its own falls back to the shop's logo,
    ' which is what the preview does and what anyone dropping one would mean.
    if src = "" and strOr(block.kind, "") = "logo" then src = strOr(board.logo, "")
    local = pictureFor(src)
    if local = "" then return

    poster = m.body.createChild("Poster")
    poster.uri = local
    poster.translation = [x, y]
    poster.width = w
    poster.height = h
    if strOr(block.fit, "") = "contain" or strOr(block.kind, "") = "logo"
        poster.loadDisplayMode = "scaleToFit"
    else
        poster.loadDisplayMode = "scaleToZoom"
    end if
end sub

sub drawPlacedReviews(board as Object, x as Float, y as Float, w as Float, h as Float)
    m.reviews = drawableReviews(board)
    m.reviewIndex = 0
    if m.reviews.count() = 0 then return

    group = m.body.createChild("Group")
    group.translation = [x, y]

    starSize = h * 0.42
    if starSize > 30 then starSize = 30
    if starSize < 12 then starSize = 12
    starsWidth = starSize * 5.6
    citeWidth = w * 0.26

    m.stars = group.createChild("Group")
    m.stars.translation = [0, (h - starSize) / 2]
    m.starSize = starSize

    m.quote = group.createChild("Label")
    m.quote.font = BoardFont(Int(m.SZ.quote), false)
    m.quote.color = m.theme.ink
    m.quote.translation = [starsWidth, 0]
    m.quote.width = w - starsWidth - citeWidth
    m.quote.height = h
    m.quote.vertAlign = "center"
    m.quote.wrap = false

    m.cite = group.createChild("Label")
    m.cite.font = BoardFont(Int(m.SZ.cite), false)
    m.cite.color = m.theme.dim
    m.cite.translation = [w - citeWidth, 0]
    m.cite.width = citeWidth
    m.cite.height = h
    m.cite.horizAlign = "right"
    m.cite.vertAlign = "center"
    m.cite.wrap = false

    showReview()

    m.reviewTimer.control = "stop"
    if m.reviews.count() > 1
        m.reviewTimer.duration = reviewSeconds()
        m.reviewTimer.control = "start"
    end if
end sub

function sectionById(board as Object, id as String) as Dynamic
    if id = "" then return invalid
    for each section in sectionsFor(board, m.top.slotId)
        if strOr(section.id, "") = id then return section
    end for
    return invalid
end function

' The local file for a picture the board names, or "" when it did not land.
function pictureFor(url as String) as String
    if url = "" then return ""
    if m.pictures = invalid then return ""
    local = m.pictures[url]
    if local = invalid then return ""
    return local
end function

' What drawItem() will use, without drawing it. Same arithmetic as
' sectionHeight() does per row.
function itemHeight(entry as Object) as Float
    h = Int(m.SZ.lineItem * m.scale)
    if strOr(entry.note, "") <> "" then h = h + Int(m.SZ.lineNote * m.scale)
    return h + Int(m.SZ.gapItem * m.scale)
end function

' ---- reading the board ----------------------------------------------------

function sectionsFor(board as Object, slotId as String) as Object
    if board.slots = invalid then return []
    sections = board.slots[slotId]
    if sections = invalid or type(sections) <> "roArray" then return []

    kept = []
    for each section in sections
        if drawableItems(section).count() > 0 then kept.push(section)
    end for
    return kept
end function

function drawableItems(section as Object) as Object
    kept = []
    if section = invalid or section.items = invalid then return kept
    for each entry in section.items
        if strOr(entry.name, "").Trim() <> "" then kept.push(entry)
    end for
    return kept
end function

function drawableReviews(board as Object) as Object
    kept = []
    if board.reviews = invalid then return kept
    if board.reviews.on <> true then return kept
    if board.reviews.items = invalid then return kept
    for each review in board.reviews.items
        if strOr(review.quote, "").Trim() <> "" then kept.push(review)
    end for
    return kept
end function

function strOr(value as Dynamic, fallback as String) as String
    if value = invalid then return fallback
    if type(value) = "roString" or type(value) = "String" then return value
    return fallback
end function

function numOr(value as Dynamic, fallback as Float) as Float
    if value = invalid then return fallback
    t = type(value)
    if t = "Integer" or t = "Float" or t = "Double" or t = "roInt" or t = "roInteger" or t = "roFloat" or t = "roDouble" or t = "LongInteger" then return value
    return fallback
end function

function intOr(value as Dynamic, fallback as Integer) as Integer
    if value = invalid then return fallback
    if type(value) = "roInt" or type(value) = "Integer" then return value
    if type(value) = "roFloat" or type(value) = "Float" then return Int(value)
    return fallback
end function
