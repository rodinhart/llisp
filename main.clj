; 1 + 2 * 2 = 5
(defn reverse (x y)
  (if x
    (let ((a . b) x) (reverse b (cons a y)))
    y))

; 1 + 2 * 3 = 7
(defn split (xs)
  (if xs
    (let ((x . ys) xs)
      (if ys
        (let (
          (y . zs) ys
          (l . rs) (split zs)
          (r . rrs) rs)
          
          (list (cons x l) (cons y r)))
        (list (list x) ())))
    (list () ())))

; 1 + 2 * 2 = 5
(defn merge (xs ys)
  (if xs
    (if ys
      (let (
        (x . xxs) xs
        (y . yys) ys)
        (if (< x y)
          (cons x (merge xxs (cons y yys)))
          (cons y (merge (cons x xxs) yys))))
      xs)
    ys))

; 1 + 2 * 3 = 7
(defn sort (xs)
  (if xs
    (let ((x . ys) xs)
      (if ys
        (let (
          (l . r) (split (cons x ys))
          (r . s) r)
          
          (merge (sort l) (sort r)))
        (cons x ())))
    ()))

(sort (list 4 2 5 7 2 2 6 3 8 3))