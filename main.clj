(defn reverse (x y)
  (if x
    ((fn ((a . b)) (reverse b (cons a y))) x)
    y))

(reverse (cons 2 (cons 3 (cons 5 ()))) ())
