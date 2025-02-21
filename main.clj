(defn reverse (x y)
  (if x
    (let ((a . b) x) (reverse b (cons a y)))
    y))

(reverse (reverse (cons 2 (cons 3 (cons 5 (cons 7 (cons 11 ()))))) ()) ())
