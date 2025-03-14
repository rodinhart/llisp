- & definitely violates if not value
- conservation of ref
  - conform: cons
  - violate: $get, (look for more)
- properly bind free vars like + and cons
- ability to destroy closures
  - current destroy of closure assumes no free vars
  - note: captures vars only captures ref in env, value is actually shared!
- wat formatter!

## memory usage

| type   |  usage | notes                        |
| ------ | -----: | ---------------------------- |
| cons   |      1 |                              |
| _base_ |      6 | + con                        |
| def    |      2 |                              |
| fn     | 1 + 2N | N = number of free variables |
