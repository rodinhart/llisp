(defn reverse (x y)
  (if x
    (let ((a . b) x) (reverse b (cons a y)))
    y))

(defn split (xs)
  (if xs
    (let ((x . ys) xs)
      (if ys
        (let (
          (y . zs) ys
          (l . rs) (split zs)
          (r . rrs) rs)
          
          (list (cons x l) (cons y r))
        )
        (list (list x) ())
      )
    )
    (list () ())
  )
)

(reverse (reverse (cons 2 (cons 3 (cons 5 (cons 7 (cons 11 ()))))) ()) ())
