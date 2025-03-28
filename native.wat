(module
  (memory (import "js" "heap") 0)
  (import "js" "unknownSymbol" (func $unknownSymbol (param $key i32)))
  (import "js" "log" (func $log (param $s i32) (result i32)))
  (import "js" "monitor" (func $monitor))
  (import "js" "err" (func $err (param $errno i32)))
  (import "js" "prn" (func $prn (param $ptr i32)))
  (global $tmp (mut i32) (i32.const 0))

  ;; table for dynamic dispatch
  (type $fntype (func (param $args i32) (param $env i32) (result i32)))
  (table 32 funcref)

  ;; ( -- ptr )
  (func $alloc (result i32)
    (local $ptr i32)

    i32.const 0 ;; push ref to free

    i32.const 0 ;; load free
    i32.load
    local.tee $ptr
    i32.eqz
    if
      i32.const 0 ;; out of memory
      call $err
    end

    local.get $ptr
    i32.const 8 ;; load next free
    i32.add
    i32.load
    i32.store

    local.get $ptr ;; return allocated
    call $monitor
  )

  ;; ( ptr -- ) frees memory
  (func $free (export "free") (param $ptr i32)
    local.get $ptr
    i32.eqz
    if
      i32.const 3 ;; null pointer
      call $err
    end

    ;; point to free
    local.get $ptr
    i32.const 8
    i32.add
    i32.const 0
    i32.load
    i32.store

    ;; store new free
    i32.const 0
    local.get $ptr
    i32.store
    call $monitor
  )

  ;; ( cdr car -- cons(car, cdr) )
  (func $cons (param $cdr i32) (param $car i32) (result i32)
    (local $ptr i32)

    call $alloc
    local.tee $ptr
    i32.const $CONS
    i32.store

    local.get $ptr
    i32.const 4
    i32.add
    local.get $car
    i32.store

    local.get $ptr
    i32.const 8
    i32.add
    local.get $cdr
    i32.store

    local.get $ptr
  )

  ;; ( n -- number(n) )
  (func $number (param $n i32) (result i32)
    (local $ptr i32)

    call $alloc
    local.tee $ptr
    i32.const $NUMBER
    i32.store

    local.get $ptr
    i32.const 4
    i32.add
    local.get $n
    i32.store

    local.get $ptr
  )

  ;; ( s -- symbol(s) )
  (func $symbol (param $s i32) (result i32)
    (local $ptr i32)

    call $alloc
    local.tee $ptr
    i32.const $SYMBOL
    i32.store

    local.get $ptr
    i32.const 4
    i32.add
    local.get $s
    i32.store

    local.get $ptr
  )

  ;; ( s -- string(s) )
  (func $string (param $s i32) (result i32)
    (local $ptr i32)

    call $alloc
    local.tee $ptr
    i32.const $STRING
    i32.store

    local.get $ptr
    i32.const 4
    i32.add
    local.get $s
    i32.store

    local.get $ptr
  )

  ;; ( ix env -- function(ix, env) )
  (func $function (param $env i32) (param $ix i32) (result i32)
    (local $ptr i32)

    call $alloc
    local.tee $ptr
    i32.const $FUNCTION ;; type function
    i32.store

    local.get $ptr
    i32.const 4
    i32.add
    local.get $ix
    i32.store

    local.get $ptr
    i32.const 8
    i32.add
    local.get $env
    i32.store

    local.get $ptr
  )

  ;; ( p -- car(p) ) non-linear
  (func $car (param $p i32) (result i32)
    local.get $p
    i32.const 4
    i32.add
    i32.load
  )

  ;; ( p -- cdr(p) ) non-linear
  (func $cdr (param $p i32) (result i32)
    local.get $p
    i32.const 8
    i32.add
    i32.load
  )

  ;; ( p -- car(p) cdr(p) ) frees memory
  (func $decon (param $p i32) (result i32 i32)
    local.get $p
    i32.eqz
    if
      i32.const 1 ;; null pointer
      call $err
    end

    ;; return car and cdr
    local.get $p
    call $car
    local.get $p
    call $cdr

    local.get $p
    call $free
  )

  ;; ( ptr -- ) frees values based on type, recursively if needed
  (func $destroy (param $ptr i32)
    local.get $ptr
    i32.eqz
    if
    else
      local.get $ptr
      call $free
    end
  )

  ;; ( key map -- map[key] )
  (func $get (param $key i32) (param $map i32) (result i32)
    (local $val i32)

    local.get $map
    i32.eqz
    if (result i32)
      local.get $key
      call $unknownSymbol
      i32.const 0
    else
      local.get $map
      call $car
      i32.const 4
      i32.add
      i32.load
      local.get $key
      i32.eq
      if (result i32)
        local.get $map
        call $cdr
        call $car

        ;; sort out ownership of val
        local.tee $val
        i32.load
        i32.const $NUMBER
        i32.eq
        if (result i32)
          ;; copy number
          local.get $val
          i32.const 4
          i32.add
          i32.load
          call $number
        else
          local.get $val
          i32.load
          i32.const $FUNCTION
          i32.eq
          if (result i32)
            ;; ref function
            local.get $val
          else
            ;; assume cons and "break" symbol name
            local.get $map
            call $car
            i32.const 4
            i32.add
            i32.const 0 ;; unknown symbol index
            i32.store

            ;; assume cons and put nil as val to move it
            local.get $map
            call $cdr
            i32.const 4
            i32.add
            i32.const 0
            i32.store

            ;; return val
            local.get $val
          end
        end
      else
        local.get $key
        local.get $map
        call $cdr
        call $cdr
        call $get
      end
    end
  )

    ;; ( key map -- map[key] ) non-linear
  (func $get2 (param $key i32) (param $map i32) (result i32)
    (local $val i32)

    local.get $map
    i32.eqz
    if (result i32)
      local.get $key
      call $unknownSymbol
      i32.const 0
    else
      local.get $map
      call $car
      i32.const 4
      i32.add
      i32.load
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
        call $get2
      end
    end
  )

  ;; ( a b -- a+b )
  (func $+ (param $args i32) (param $env i32) (result i32)
    (local $a i32)
    (local $b i32)

    local.get $args
    call $decon
    call $decon
    drop

    local.tee $args
    i32.const 4
    i32.add
    i32.load
    local.set $a
    local.get $args
    call $free

    local.tee $args
    i32.const 4
    i32.add
    i32.load
    local.set $b

    local.get $args
    i32.const 4
    i32.add
    local.get $a
    local.get $b
    i32.add
    i32.store

    local.get $args
  )

  ;; ( a b -- a=b )
  (func $= (param $args i32) (param $env i32) (result i32)
    (local $a i32)
    (local $b i32)

    local.get $args
    call $decon
    call $decon
    drop

    local.tee $args
    i32.const 4
    i32.add
    i32.load
    local.set $a
    local.get $args
    call $free

    local.tee $args
    i32.const 4
    i32.add
    i32.load
    local.set $b
    local.get $args
    call $free

    local.get $a
    local.get $b
    i32.eq
  )

  ;; ( a b c ... -- (a b c ...))
  (func $list (param $args i32) (param $env i32) (result i32)
    local.get $args
  )

  ;; cg<-

  (func (export "main") (result i32)
    (local $env i32)

    ;; cl<-

  )
)
