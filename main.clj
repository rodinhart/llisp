(def adder (fn (d) (fn (x) (+ x d))))

(def inc (adder 3))

(inc 8)