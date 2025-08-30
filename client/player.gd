extends CharacterBody2D

const SPEED := 200.0
var can_dash := true
var can_attack := true
var is_guarding := false

func _physics_process(delta: float) -> void:
    var input_vec := Vector2(
        Input.get_action_strength("ui_right") - Input.get_action_strength("ui_left"),
        Input.get_action_strength("ui_down") - Input.get_action_strength("ui_up")
    ).normalized()
    velocity = input_vec * SPEED
    move_and_slide()

    if Input.is_action_just_pressed("attack_light"):
        perform_attack("light")
    elif Input.is_action_just_pressed("attack_heavy"):
        perform_attack("heavy")

    is_guarding = Input.is_action_pressed("guard")

    if Input.is_action_just_pressed("dash") and can_dash:
        velocity += input_vec * 400
        can_dash = false
        await get_tree().create_timer(0.5).timeout
        can_dash = true

func perform_attack(kind: String) -> void:
    if not can_attack:
        return
    can_attack = false
    # Placeholder attack logic
    await get_tree().create_timer(0.3).timeout
    can_attack = true
