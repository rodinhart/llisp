const basic = `
pc = 15 : lr = 14 : sp = 13
DIM code% 1023
FOR p% = 0 TO 2 STEP 2
P% = code%
[OPT p%

.alloc%
 LDR r0, [r12]
 LDR r1, [r0, #8]
 STR r1, [r12]
 MOVS pc, lr

.number%
 STMFD (sp)!, {r0, lr}
 BL alloc%
 MOV r1, #1
 STR r1, [r0, #0]
 LDMFD (sp)!, {r1, lr}
 STR r1, [r0, #4]
 MOVS pc, lr

.main%
 STMFD (sp)!, { r12, lr }
 MOV r12, r0
 MOV r0, #42
 BL number%
 LDMFD (sp)!, { r12, pc }
]
NEXT p%

DIM heap% 1023
heap%!0 = heap% + 4
heap%!12 = 0

A% = heap%
r% = USR(main%)
PRINT r%!4
PRINT !heap%
`

const withLineNumbers = basic
  .replace(/\r/g, "")
  .trim()
  .split("\n")
  .map((line, i) => `${String(i + 1).padStart(2, " ")} ${line}`)
  .join("\n")

console.log(withLineNumbers)

// ..\deno.exe run .\ARM\compile.js > ARM/basic.txt
