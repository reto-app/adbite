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
    m.theme = BoardTheme(strOr(board.theme, "chalk"))

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
    name = m.body.createChild("Label")
    name.text = strOr(board.shopName, "Your shop")
    name.font = BoardFont(m.SZ.shop, true)
    name.color = m.theme.ink
    name.translation = [m.SZ.padX, m.SZ.padTop]
    name.width = W - m.SZ.padX - m.SZ.padX - m.SZ.slotW
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
        line.translation = [m.SZ.padX, m.SZ.padTop + m.SZ.shop + 12]
        line.width = W - m.SZ.padX - m.SZ.padX
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

sub drawSection(section as Object, x as Float, y as Float, colWidth as Float)
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
    sold = strOr(entry.badge, "none") = "out"
    row = m.body.createChild("Group")
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
    h = Int(m.SZ.section * m.scale) + Int(m.SZ.gapTitle * m.scale)
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

    m.stars.removeChildrenIndex(m.stars.getChildCount(), 0)
    for i = 0 to stars - 1
        star = m.stars.createChild("Poster")
        star.uri = "pkg:/images/star.png"
        star.width = 24
        star.height = 24
        star.blendColor = m.theme.accent
        star.translation = [i * 27, 0]
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

function intOr(value as Dynamic, fallback as Integer) as Integer
    if value = invalid then return fallback
    if type(value) = "roInt" or type(value) = "Integer" then return value
    if type(value) = "roFloat" or type(value) = "Float" then return Int(value)
    return fallback
end function
