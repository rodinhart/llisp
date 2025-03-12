- conservation of ref
  - conform: cons
  - violate: car, cdr, $get, (look for more)
- properly bind free vars like + and cons
- ability to destroy closures
- wat formatter!

## memory usage

| type   |  usage | notes                        |
| ------ | -----: | ---------------------------- |
| cons   |      1 |                              |
| _base_ |      6 | + con                        |
| def    |      2 |                              |
| fn     | 1 + 2N | N = number of free variables |
