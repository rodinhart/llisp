(module
  (memory (import "js" "heap") 0)
  (import "js" "oem" (func $oem))
  (import "js" "unknownSymbol" (func $unknownSymbol (param $key i32)))
  (import "js" "log" (func $log (param $s i32) (result i32)))
  (import "js" "monitor" (func $monitor))
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

  ;; ( p -- cdr(p) ) frees memory
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

   ;; i32.const 0 ;; empty env
   ;; i32.const 0 ;; $+
   ;; call $cons
   ;; call $cons
   ;; i32.const 1 ;; +
   ;; call $cons

    local.set $env

    ;; cl<-

  )
)
