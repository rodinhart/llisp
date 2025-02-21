- allow decons notation
- implement $free (to replace call $decon followed by drop)
- refactor getting i32 from symbol
- make create bindings sequential by setting $env
- ability to destroy closures

## memory usage

| type   |  usage | notes                        |
| ------ | -----: | ---------------------------- |
| cons   |      1 |                              |
| _base_ |      3 | +                            |
| def    |      2 |                              |
| fn     | 1 + 2N | N = number of free variables |
