(defn reverse (xs ys)
  (if xs
    (let ((x . rx) xs)
      (reverse rx (cons x ys)))
    (do xs ys)))

(defn split (xs)
  (if xs
    (let ((x . rx) xs)
      (if rx
        (let (
          (y . ry) rx
          (l . r) (split ry))
          
          (cons (cons x l) (cons y r)))
        (cons (cons x rx) ())))
    (cons xs ())))

(defn merge (f xs ys)
  (if xs
    (if ys
      (let (
        (x . rx) xs
        (y . ry) ys)
        
        (if (f x y)
          (cons x (merge f rx (cons y ry)))
          (cons y (merge f (cons x rx) ry))))
      (let ((a . b) f) (do a b ys xs))) ; should destroy unused automatically
    (let ((a . b) f) (do a b xs ys)))) ; should destroy unused automatically

(defn sort (f xs)
  (if xs
    (let ((x . rx) xs)
      (if rx
        (let (
          (l . r) (split (cons x rx))
          (f . f2) (copy f)
          (f . f3) (copy f))
          
          (merge f (sort f2 l) (sort f3 r)))
        (let ((a . b) f) (do a b (cons x rx)))))
    (let ((a . b) f) (do a b xs))))

(defn map (f xs)
  (if xs
    (let (
      (x . rx) xs
      y (f x)) ; because args is evaluated back-to-front

      (cons y (map f rx)))
    (let ((a . b) f) (do a b xs))))


(defn range (a b)
  (if (< a b)
    (let (
      hack (cons a b) ; cause copy only works on single cons
      (x . y) (copy hack)
      (a . b) x
      (a' . b') y)
      
      (do b' (cons a (range (+ a' 1) b))))
    (do a b ())))


(defn count (xs)
  (if xs
    (let ((x . rx) xs)
      (do x (+ 1 (count rx))))
    (do xs 0)))

(defn zip (xs ys)
  (if xs
    (if ys
      (let (
        (x . rx) xs
        (y . ry) ys)
        
        (cons (cons x y) (zip rx ry)))
      (do ys xs))
    (do xs ys)))


(defn with-index (xs i)
  (if xs
    (let (
      (x . rx) xs
      hack (cons i ())
      (h . h') (copy hack)
      (a . b) h
      (a'  . b') h')

      (do b b' (cons (cons x a) (with-index rx (+ a' 1)))))
    (do i xs)))

; need get that just returns val
(defn get (xs key)
  (if xs
    (let (
      (k . ts) xs
      (v . rx) ts)
      
      (if (= k key)
        (let ((v . val) (copy-scalar v))
          (do key (cons val (cons k (cons v rx)))))
        (let ((val . ys) (get rx key))
          (cons val (cons k (cons v ys))))))
    (do key (cons () xs))))


;; ; 3 + 2 * 1 = 5 (63)
;; (defn dissoc (xs key)
;;   (if xs
;;     (let ((k . ys) xs (v . zs) ys)
;;       (if (= k key)
;;         zs
;;         (cons k (cons v (dissoc zs key)))))
;;     ()))

;; ; 3 + 2 * 1 = 5 (68)
;; (defn assoc (xs key val)
;;   (cons key (cons val (dissoc xs key))))

;; ; 3 + 2 * 1 = 5 (73)
;; (defn get (xs key)
;;   (if xs
;;     (let (k (car xs) v (car (cdr xs)))
;;       (if (= k key)
;;         v
;;         (get (cdr (cdr xs)) key)))
;;     ()))


(def data '(
  ("name" "Alice" "grade" 3)
  ("name" "Bob" "grade" 1)
  ("name" "Charles" "grade" 2)
  ("name" "Doris" "grade" 3)
  ("name" "Ellis" "grade" 1)
))

;; ;; (def state '("group-by" 1))

;; (let (
;;   f (fn (a b) (<= (get b "grade") (get a "grade")))
;;   z (with-index (sort f (copy data)))
;;   f (fn ((row . i)) '("text" ("y" ~(* 16 (+ i 1))) ~(get row "name")))
;;   res (map f z))

;;   '("g" () ~@res))


(map (fn (row) (let ((val . rx) (get row "grade")) (do rx val))) data)