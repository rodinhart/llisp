; 3 + 2 * 1 = 5
(defn reverse (x y)
  (if x
    (let ((a . b) x) (reverse b (cons a y)))
    y))

; 3 + 2 * 1 = 5 (10)
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

; 3 + 2 * 1 = 5 (15)
(defn merge (f xs ys)
  (if xs
    (if ys
      (let (
        (x . xxs) xs
        (y . yys) ys)
        (if (f x y)
          (cons x (merge f xxs (cons y yys)))
          (cons y (merge f (cons x xxs) yys))))
      xs)
    ys))

; 3 + 2 * 3 = 9 (24)
(defn sort (f xs)
  (if xs
    (let ((x . ys) xs)
      (if ys
        (let (
          (l . r) (split (cons x ys))
          (r . s) r)
          
          (merge f (sort f l) (sort f r)))
        (cons x ())))
    ()))

; 3 + 2 * 1 = 5 (29)
(defn map (f xs)
  (if xs
    (let ((x . ys) xs)
      (cons (f x) (map f ys)))
    ()))

; 3 + 2 * 1 = 5 (34)
(defn range (a b)
  (if (< a b)
    (cons a (range (+ a 1) b))
    ()))

; 3 + 2 * 1 = 5 (39)
(defn count (xs)
  (if xs
    (+ 1 (count (cdr xs)))
    0))

; 3 + 2 * 1 = 5 (44)
(defn zip (xs ys)
  (if xs
    (if ys
      (let (
        (x . xxs) xs
        (y . yys) ys)
        
        (cons (cons x y) (zip xxs yys)))
      ())
    ()))

; 3 + 2 * 3 = 9 (53)
(defn with-index (xs)
  (zip xs (range 0 (count xs))))

; 3 + 2 * 1 = 5 (58)
(defn copy (xs)
  (if xs
    (cons (car xs) (copy (cdr xs)))
    ()))

; 3 + 2 * 1 = 5 (63)
(defn dissoc (xs key)
  (if xs
    (let ((k . ys) xs (v . zs) ys)
      (if (= k key)
        zs
        (cons k (cons v (dissoc zs key)))))
    ()))

; 3 + 2 * 1 = 5 (68)
(defn assoc (xs key val)
  (cons key (cons val (dissoc xs key))))

; 3 + 2 * 1 = 5 (73)
(defn get (xs key)
  (if xs
    (let (k (car xs) v (car (cdr xs)))
      (if (= k key)
        v
        (get (cdr (cdr xs)) key)))
    ()))

; 2 + 5 * (1 + 4) = 27 (100)
(def data '(
  ("name" "Alice" "grade" 3)
  ("name" "Bob" "grade" 1)
  ("name" "Charles" "grade" 2)
  ("name" "Doris" "grade" 3)
  ("name" "Ellis" "grade" 1)
))

;; (def state '("group-by" 1))

(let (
  f2 (fn (a b) (<= (get b "grade") (get a "grade")))
  z (with-index (sort f2 (copy data)))
  f (fn ((row . i)) '("text" ("y" ~(* 16 (+ i 1))) ~(get row "name")))
  res (map f z)

  (a . b) f2
  (a . b) b
  (a . b) b

  (a . b) f
  (a . b) b
  (a . b) b)

  '("g" () ~@res))

;; (get (list "x" 10 "y" 20 "z" 30) "a")

