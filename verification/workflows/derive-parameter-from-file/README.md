# Derive Parameter From File

Verifies that `param_value_from_file` reads a one-value dataset into a typed Galaxy workflow parameter.

The fixture uses an integer scalar because wrong-port wiring is the main ambiguity: the workflow must expose `integer_param`, not the original dataset output.
