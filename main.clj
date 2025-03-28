;; (defn reverse (xs ys)
;;   (if &xs
;;     (let ((x . rx) xs)
;;       (reverse rx (cons x ys)))
;;     (do xs ys)))

;; (defn split (xs)
;;   (if &xs
;;     (let ((x . rx) xs)
;;       (if &rx
;;         (let (
;;           (y . ry) rx
;;           (l . r) (split ry))
          
;;           (cons (cons x l) (cons y r)))
;;         (cons (cons x rx) ())))
;;     (cons xs ())))

;; (defn merge (f xs ys)
;;   (if &xs
;;     (if &ys
;;       (let (
;;         (x . rx) xs
;;         (y . ry) ys)
        
;;         (if (f &x &y)
;;           (cons x (merge f rx (cons y ry)))
;;           (cons y (merge f (cons x rx) ry))))
;;       (let ((a . b) f) (do a b ys xs))) ; should destroy unused automatically
;;     (let ((a . b) f) (do a b xs ys)))) ; should destroy unused automatically

;; (defn sort (f xs)
;;   (if &xs
;;     (let ((x . rx) xs)
;;       (if &rx
;;         (let (
;;           (l . r) (split (cons x rx))
;;           (f . f2) (copy-cons f)
;;           (f . f3) (copy-cons f))
          
;;           (merge f (sort f2 l) (sort f3 r)))
;;         (let ((a . b) f) (do a b (cons x rx)))))
;;     (let ((a . b) f) (do a b xs))))

;; (defn map (f xs)
;;   (if &xs
;;     (let (
;;       (x . rx) xs
;;       y (f x)) ; because args is evaluated back-to-front

;;       (cons y (map f rx)))
;;     (let ((a . b) f) (do a b xs))))

;; (defn range (a b)
;;   (if (< &a &b)
;;     (cons a (range (+ &a 1) b))
;;     (do a b ())))

;; (defn count (xs)
;;   (if &xs
;;     (let ((x . rx) xs)
;;       (do x (+ 1 (count rx))))
;;     (do xs 0)))

;; (defn zip (xs ys)
;;   (if &xs
;;     (if &ys
;;       (let (
;;         (x . rx) xs
;;         (y . ry) ys)
        
;;         (cons (cons x y) (zip rx ry)))
;;       (do ys xs))
;;     (do xs ys)))

;; (defn unzip (xs)
;;   (if &xs
;;     (let (
;;       (x . rx) xs
;;       (y . z) x
;;       (ys . zs) (unzip rx))
      
;;       (cons (cons y ys) (cons z zs)))
;;     (cons () xs)))

;; (defn unmap (f xs) (unzip (map f xs)))

;; (defn with-index (xs i)
;;   (if &xs
;;     (let (
;;       (x . rx) xs)

;;       (cons (cons x i) (with-index rx (+ &i 1))))
;;     (do i xs)))

;; ; need get that just returns val
;; (defn get (xs key)
;;   (if &xs
;;     (let (
;;       (k . ts) xs
;;       (v . rx) ts)
      
;;       (if (= &k &key)
;;         (do key (cons v (cons k (cons &v rx))))
;;         (let ((val . ys) (get rx key))
;;           (cons val (cons k (cons v ys))))))
;;     (do key (cons () xs))))

;; (def data2 '(
;;   ("name" "Alice" "grade" 3 "department" "Dev")
;;   ("name" "Bob" "grade" 1 "department" "QA")
;;   ("name" "Charles" "grade" 2 "department" "Dev")
;;   ("name" "Doris" "grade" 3 "department" "Dev")
;;   ("name" "Ellis" "grade" 1 "department" "QA")
;; ))

;; ;; ;; (def state '("group-by" 1))

;; ;; (103)

;; (let (
;;   data (sort (fn (a b) (<=
;;     (let ((x . a) (get a "grade")) (do a x))
;;     (let ((y . b) (get b "grade")) (do b y)))) data2)
;;   (names . data) (unmap (fn (row) (get row "name")) data)
;;   (deps . data) (unmap (fn (row) (get row "department")) data)
;;   cells (reverse
;;     (map (fn ((name . i)) '("text" ("y" ~(* 16 i)) ~name)) (with-index names 1))
;;     (map (fn ((name . i)) '("text" ("x" 100 "y" ~(* 16 i)) ~name)) (with-index deps 1))))
  
;;   (do data '("g" () ~@cells)))

(defn reverse (xs ys)
  (if (null? xs)
    (let ((x . rx) xs)
      (reverse rx (cons x ys)))
    ys))

(reverse (list 4 3 2 1) (list 5 6 7))