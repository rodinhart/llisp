- & definitely violates if not value
  - need types!
- conservation of ref
  - conform: cons
  - violate: $get, (look for more)
- properly bind free vars like + and cons
- ability to destroy closures
  - current destroy of closure assumes no free vars
  - note: captures vars only captures ref in env, value is actually shared!

## memory usage

| type   | usage (units) | notes                        |
| ------ | :-----------: | ---------------------------- |
| cons   |       1       |                              |
| _base_ |   (1 + 2)N    | N = number of core functions |
| def    |       2       |                              |
| fn     |    1 + 2N     | N = number of free variables |
