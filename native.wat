(module
  (memory (import "js" "heap") 0)
  (import "js" "oem" (func $oem))
  (import "js" "unknownSymbol" (func $unknownSymbol (param $key i32)))
  (import "js" "log" (func $log (param $s i32) (result i32)))
  (import "js" "monitor" (func $monitor))
  (import "js" "err" (func $err (param $errno i32)))
  (import "js" "prn" (func $prn (param $ptr i32)))
  (global $tmp (mut i32) (i32.const 0))
  (global $tmp2 (mut i32) (i32.const 0))

  (type $fntype (func (param $args i32) (param $env i32) (result i32)))
  (table 32 funcref)

  ;; ( p -- car(p) )
  (func $car (param i32) (result i32)
    local.get 0
    i32.load
  )

  ;; ( p -- cdr(p) )
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
      call $oem
    end

    i32.const 0 ;; return new cons
    i32.load

    i32.const 0 ;; push ref to free
    i32.const 0 ;; push next free
    i32.load
    i32.const 4
    i32.add
    i32.load

    i32.const 0 ;; store car
    i32.load
    local.get $car
    i32.store

    i32.const 0 ;; store cdr
    i32.load
    i32.const 4
    i32.add
    local.get $cdr
    i32.store

    i32.store ;; store next free
    call $monitor
  )
  (elem (i32.const 1) $cons)

  ;; ( p -- car(p) cdr(p) ) frees memory
  (func $decon (param $c i32) (result i32 i32)
    local.get $c
    i32.eqz
    if
      i32.const 1
      call $err
    end

    local.get $c ;; return car and cdr
    call $car
    local.get $c
    call $cdr

    local.get $c ;; point to free
    i32.const 4
    i32.add
    i32.const 0
    i32.load
    i32.store

    local.get $c ;; clear car of free
    i32.const 98
    i32.store

    i32.const 0 ;; store new free
    local.get $c
    i32.store
    call $monitor
  )

  ;; ( c -- cdr(c) ) frees memory
  (func $destroy (export "destroy") (param $c i32) (result i32)
    local.get $c ;; return cdr
    call $cdr
    
    local.get $c ;; point to free
    i32.const 4
    i32.add
    i32.const 0
    i32.load
    i32.store

    local.get $c ;; clear car of free
    i32.const 98
    i32.store

    i32.const 0 ;; store new free
    local.get $c
    i32.store
    call $monitor
  )

  ;; ( c -- c c )
  (func $copy (param $c i32) (result i32 i32)
    local.get $c
    call $cdr
    local.get $c
    call $car
    call $cons
    local.get $c
  )

  ;; ( key map -- map[key] )
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

    local.get $map ;; get key and val
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
  (elem (i32.const 0) $+)

  ;; cg<-

  (func (export "main") (result i32)
    (local $env i32)

    i32.const 0 ;; new env
    local.set $env

    ;; cl<-

  )
)
