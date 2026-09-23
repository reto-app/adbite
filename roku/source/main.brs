' AdBite Board — entry point.
'
' There is nothing to navigate. The channel opens on the board and stays
' there, so Main does the least a SceneGraph channel can do: put the scene up
' and sit on the message port until the device closes it.

sub Main(args as Dynamic)
    screen = CreateObject("roSGScreen")
    port = CreateObject("roMessagePort")
    screen.setMessagePort(port)

    scene = screen.CreateScene("BoardScene")
    screen.show()

    ' A board URL can be handed in at launch, which is how a TV on a wall gets
    ' pointed at a server without being taken down and re-sideloaded:
    '
    '   curl -d "" "http://<roku-ip>:8060/launch/dev?remoteUrl=<urlencoded>"
    '
    ' It is written to the registry on the way past, so the TV stays pointed
    ' there through a reboot or a power cut. Passing `default` clears it and
    ' puts the set back on the board inside its own package.
    if args <> invalid and args.remoteUrl <> invalid and args.remoteUrl <> ""
        section = CreateObject("roRegistrySection", "adbite")
        if LCase(args.remoteUrl) = "default"
            section.Delete("remoteUrl")
            section.Delete("etag")
        else
            section.Write("remoteUrl", args.remoteUrl)
            ' The cached copy and its tag belong to the old URL.
            section.Delete("etag")
            scene.launchRemoteUrl = args.remoteUrl
        end if
        section.Flush()
    end if

    ' Which way up, from the launch:
    '
    '   curl -d "" "http://<roku-ip>:8060/launch/dev?hang=show"
    '   curl -d "" "http://<roku-ip>:8060/launch/dev?hang=left"
    '
    ' A TV with "Control by mobile apps" switched off refuses every ECP key
    ' press, which on a Roku TV can leave the OPTIONS overlay unreachable
    ' altogether. Launching still works, so the card can still be opened and
    ' the screen still set, without anybody climbing to the wall.
    hang = ""
    if args <> invalid
        if args.hang <> invalid then hang = args.hang
        if args.Hang <> invalid then hang = args.Hang
    end if
    if hang <> "" then scene.launchHang = LCase(hang)

    while true
        msg = wait(0, port)
        if type(msg) = "roSGScreenEvent"
            if msg.isScreenClosed() then return
        end if
    end while
end sub
