(module
  (memory (import "js" "heap") 0)
  (import "js" "unknownSymbol" (func $unknownSymbol (param $key i32)))
  (import "js" "log" (func $log (param $s i32) (result i32)))
  (import "js" "monitor" (func $monitor))
  (import "js" "err" (func $err (param $errno i32)))
  (import "js" "prn" (func $prn (param $ptr i32)))
  (global $tmp (mut i32) (i32.const 0))
  (global $tmp2 (mut i32) (i32.const 0))

  ;; table for dynamic dispatch
  (type $fntype (func (param $args i32) (param $env i32) (result i32)))
  (table 32 funcref)

  ;; ( p -- car(p) ) non-linear
  (func $car (param i32) (result i32)
    local.get 0
    i32.load
  )

  ;; ( p -- cdr(p) ) non-linear
  (func $cdr (param i32) (result i32)
    local.get 0
    i32.const 4
    i32.add
    i32.load
  )

  ;; ( cdr car -- (car.cdr) ) allocates memory
  (func $cons (param $cdr i32) (param $car i32) (result i32)
    i32.const 0
    i32.load
    i32.eqz
    if
      i32.const 0
      call $err
    end

    ;; return free (new cons)
    i32.const 0
    i32.load

  
    ;; push ref to free
    i32.const 0 

    ;; push next free
    i32.const 0 
    i32.load
    i32.const 4
    i32.add
    i32.load

    ;; store car
    i32.const 0
    i32.load
    local.get $car
    i32.store

    ;; store cdr
    i32.const 0
    i32.load
    i32.const 4
    i32.add
    local.get $cdr
    i32.store

    ;; store next free
    i32.store
    call $monitor
  )

  ;; ( p -- car(p) cdr(p) ) frees memory
  (func $decon (param $c i32) (result i32 i32)
    local.get $c
    i32.eqz
    if
      i32.const 1
      call $err
    end

    ;; return car and cdr
    local.get $c
    call $car
    local.get $c
    call $cdr

    ;; point to free
    local.get $c
    i32.const 4
    i32.add
    i32.const 0
    i32.load
    i32.store

    ;; clear car of free
    local.get $c
    i32.const 98
    i32.store

    ;; store new free
    i32.const 0
    local.get $c
    i32.store
    call $monitor
  )

  ;; ( c -- cdr(c) ) frees memory
  (func $destroy (export "destroy") (param $c i32) (result i32)
    local.get $c ;; return cdr
    call $cdr
    
    ;; point to free
    local.get $c
    i32.const 4
    i32.add
    i32.const 0
    i32.load
    i32.store

    ;; clear car of free
    local.get $c
    i32.const 98
    i32.store

    ;; store new free
    i32.const 0
    local.get $c
    i32.store
    call $monitor
  )

  ;; ( c -- c c )
  (func $copy-cons (param $c i32) (result i32 i32)
    local.get $c
    call $cdr
    local.get $c
    call $car
    call $cons
    local.get $c
  )

  ;; ( key map -- map[key] ) non-linear
  (func $get (param $key i32) (param $map i32) (result i32)
    local.get $map
    i32.eqz
    if (result i32)
      local.get $key
      call $unknownSymbol
      i32.const 0
    else
      local.get $map
      call $car
      local.get $key
      i32.eq
      if (result i32)
        local.get $map
        call $cdr
        call $car
      else
        local.get $key
        local.get $map
        call $cdr
        call $cdr
        call $get
      end
    end
  )

  ;; ( key map -- map[key] map ) throws error if not found
  (func $remove (param $key i32) (param $map i32) (result i32 i32)
    (local $k i32)
    (local $v i32)

    local.get $map
    i32.eqz
    if
      local.get $key
      call $unknownSymbol
    end

    ;; get key and val
    local.get $map
    call $decon
    local.tee $map
    i32.eqz
    if
      i32.const 3
      call $err
    end
    local.get $map
    call $decon
    local.set $map
    local.set $v
    local.tee $k
    local.get $key
    i32.eq
    if (result i32 i32)
      local.get $v ;; return val and new map
      local.get $map
    else
      local.get $key ;; recurse
      local.get $map
      call $remove
      local.get $v ;; add back key and val
      call $cons
      local.get $k
      call $cons
    end
  )

  ;; ( a b -- a+b )
  (func $+ (param $args i32) (param $env i32) (result i32)
   local.get $args
   call $decon
   call $decon
   drop
   i32.add
  )

  ;; ( a b c ... -- (a b c ...))
  (func $list (param $args i32) (param $env i32) (result i32)
    local.get $args
  )

   ;; ( a b -- a<b )
  (func $< (param $args i32) (param $env i32) (result i32)
   local.get $args
   call $decon
   call $decon
   drop
   i32.lt_s
  )

  ;; ( a b -- a*b )
  (func $* (param $args i32) (param $env i32) (result i32)
   local.get $args
   call $decon
   call $decon
   drop
   i32.mul
  )

  ;; ( a b -- a<=b )
  (func $<= (param $args i32) (param $env i32) (result i32)
   local.get $args
   call $decon
   call $decon
   drop
   i32.le_s
  )

  ;; ( a b -- a=b )
  (func $= (param $args i32) (param $env i32) (result i32)
   local.get $args
   call $decon
   call $decon
   drop
   i32.eq
  )

  ;; cg<-

  (func (export "main") (result i32)
    (local $env i32)

    ;; new env
    i32.const 0
    local.set $env

    ;; cl<-

  )
)
