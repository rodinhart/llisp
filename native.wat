(module
  (memory (import "js" "heap") 0)
  (import "js" "oem" (func $oem))
  (import "js" "unknownSymbol" (func $unknownSymbol (param $key i32)))
  (import "js" "log" (func $log (param $s i32) (result i32)))
  (global $free (mut i32) (i32.const 4))

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
    global.get $free
    i32.eqz
    if
      call $oem
    end

    global.get $free ;; return new cons


    global.get $free ;; push next free
    i32.const 4
    i32.add
    i32.load

    global.get $free ;; store car
    local.get $car
    i32.store

    global.get $free ;; store cdr
    i32.const 4
    i32.add
    local.get $cdr
    i32.store

    global.set $free ;; store next free
  )

  ;; ( p -- car(p) cdr(p) ) frees memory
  (func $decon (param $c i32) (result i32 i32)
    local.get $c
    call $car
    local.get $c
    call $cdr

    local.get $c ;; point to free
    i32.const 4
    i32.add
    global.get $free
    i32.store

    local.get $c ;; clear car of free
    i32.const 98
    i32.store

    local.get $c ;; store new free
    global.set $free
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

    i32.const 0
    i32.const 0 ;; $+
    call $cons

    i32.const 43 ;; +
    call $cons

    local.set $env

    ;; cl<-

    i32.const 0
    global.get $free
    i32.store
  )
)
