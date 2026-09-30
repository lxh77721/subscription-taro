import * as React from "react"
import { Textarea as TaroTextarea, View } from "@tarojs/components"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.ComponentPropsWithoutRef<typeof TaroTextarea> {
  className?: string
  autoFocus?: boolean
}

/**
 * 多行输入框。
 *
 * 注意两点（小程序特有问题）：
 * 1. textarea 是原生组件、层级最高，一旦高度超出外层容器就会盖住下方按钮，
 *    因此外层不写死高度（用 min-height），内层高度随内容自适应。
 * 2. 调用方传入的 style（minHeight / padding / backgroundColor）作用在**外层容器**上，
 *    内层只负责输入本身，避免「背景在外层、尺寸在内层」造成的错位。
 */
const Textarea = React.forwardRef<
  React.ElementRef<typeof TaroTextarea>,
  TextareaProps
>(({ className, autoFocus, focus, onFocus, onBlur, style, ...props }, ref) => {
  const [isFocused, setIsFocused] = React.useState(false)
  const disabled = !!(props as any).disabled

  const boxStyle = (style || {}) as Record<string, string | number>
  /** 最小高度：沿用调用方设置，缺省 80px */
  const minHeight = boxStyle.minHeight ?? "80px"

  React.useEffect(() => {
    if (autoFocus || focus) setIsFocused(true)
  }, [autoFocus, focus])

  return (
    <View
      className={cn(
        "box-border w-full rounded-md border border-input bg-background px-3 py-2",
        isFocused && "border-ring ring-4 ring-ring ring-offset-2 ring-offset-background",
        className
      )}
      style={{ ...boxStyle, height: "auto", overflow: "hidden", boxSizing: "border-box" }}
      onTouchStart={() => {
        if (disabled) return
        setIsFocused(true)
      }}
    >
      <TaroTextarea
        className="w-full bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm selection:bg-selection selection:text-selection-foreground"
        placeholderClass="text-muted-foreground"
        // 高度交给内容自适应，最小高度与容器一致，避免原生组件溢出遮住后续按钮
        style={{ width: "100%", minHeight, background: "transparent", padding: 0, boxSizing: "border-box" }}
        autoHeight
        ref={ref}
        focus={autoFocus || focus}
        onFocus={(e) => {
          setIsFocused(true)
          onFocus?.(e)
        }}
        onBlur={(e) => {
          setIsFocused(false)
          onBlur?.(e)
        }}
        {...props}
      />
    </View>
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
