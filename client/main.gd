extends Node2D

var ws := WebSocketClient.new()

func _ready() -> void:
    ws.connect("connection_established", Callable(self, "_on_connected"))
    ws.connect("data_received", Callable(self, "_on_data"))
    ws.connect("connection_closed", Callable(self, "_on_closed"))
    ws.connect("connection_error", Callable(self, "_on_closed"))
    ws.connect_to_url("ws://localhost:8080")

func _process(delta: float) -> void:
    if ws.get_connection_status() != WebSocketClient.CONNECTION_DISCONNECTED:
        ws.poll()

func _on_connected(protocol: String = "") -> void:
    print("Connected to server")
    var peer := ws.get_peer(1)
    peer.put_packet(JSON.stringify({"type": "login", "name": "guest"}).to_utf8_buffer())
    peer.put_packet(JSON.stringify({"type": "set_loadout", "weapon": "sword", "skills": [
        {"trigger": "button", "action": "melee_slash", "modifiers": ["fire"]},
        {"trigger": "button", "action": "projectile", "modifiers": []}
    ]}).to_utf8_buffer())
      peer.put_packet(JSON.stringify({"type": "practice", "difficulty": "easy"}).to_utf8_buffer())
      peer.put_packet(JSON.stringify({"type": "use_skill", "index": 0}).to_utf8_buffer())
      peer.put_packet(JSON.stringify({"type": "action", "action": "light"}).to_utf8_buffer())
      peer.put_packet(JSON.stringify({"type": "action", "action": "dash"}).to_utf8_buffer())
      peer.put_packet(JSON.stringify({"type": "action", "action": "parry"}).to_utf8_buffer())
      peer.put_packet(JSON.stringify({"type": "ping"}).to_utf8_buffer())

func _on_data() -> void:
    var peer := ws.get_peer(1)
    while peer.get_available_packet_count() > 0:
        var data := peer.get_packet().get_string_from_utf8()
        var msg := JSON.parse(data).result
        match msg.type:
            "welcome":
                print("Player id: %s" % msg.id)
            "pong":
                print("Pong %s" % msg.time)
            "bot_action":
                print("Bot action: %s" % msg.action)
            "match_start":
                print("Match vs %s" % msg.opponent)
            "loadout_ok":
                print("Loadout set")
            "action_result":
                if msg.ok:
                    print("Action %s ok" % msg.action)
                else:
                    print("Action %s failed: %s" % [msg.action, msg.reason])
            "skill_executed":
                print("Skill %d executed (cost %d)" % [msg.index, msg.skill.cost])
            "profile":
                print("Level %d XP %d" % [msg.user.level, msg.user.xp])
            _:
                print("Server: %s" % data)

func _on_closed(was_clean: bool = false) -> void:
    print("Disconnected from server")
