[[PAGE 1]]
# Knot, Hopf Algebra and Quantum Invariants

Chen Yuwen

2026 年 6 月 22 日

## 摘要

本文解释 Reshetikhin–Turaev 三维流形不变量的基本构造机制。几何侧的核心对象是 framed link：一个 framed link 可作为四维 2-handlebody 的 attaching link，其边界给出 closed oriented 3-manifold；不同 attaching links 给出同胚三维流形的差异由 Kirby calculus 控制。代数侧的核心对象是 ribbon Hopf algebra 及其表示范畴：coproduct 使表示范畴带有张量积，antipode 给出对偶，universal R-matrix 给出 braiding，Turaev 的 universal twist 给出 twist，从而可以通过 graphical calculus构造 colored framed link invariant。为了使 link invariant 下降为三维流形不变量，还需要 modular data：有限 simple colors、quantum dimensions、Hopf link S-matrix的非退化性，以及对 negligible morphisms 的处理。最终，通过 Kirby color 加权求和与 signature 归一化，得到对 Kirby moves 不变的数量，即 Reshetikhin–Turaev型 closed oriented 3-manifold invariant。

关键词： framed link；Kirby calculus；ribbon Hopf algebra；ribbon category；modular category；Reshetikhin–Turaev invariant

## 1 引言

Jones polynomial 的发现把 knot theory、Lie theory 与 quantum groups 联系起来。Reshetikhin 与 Turaev 的工作进一步说明，这种联系并不止于 S3 中的 link invariants：在合适的 root of unity 情形下，quantum group 的表示论还可以通过 surgery presentation产生 closed oriented 3-manifold 的拓扑不变量 [RT2]。Turaev 后来的系统表述则把这种构造放入 ribbon category 与 modular category 的框架中 [T94]。

本文按照“几何侧、代数侧、三维流形不变量”的顺序组织。几何侧解释为什么 framedlink 足以描述 closed oriented 3-manifold；代数侧解释 Hopf algebra 的结构如何对应tangle diagram 的局部构件；最后说明 modular data 如何保证由 link invariant 写出的surgery expression 对 Kirby moves 不变。


[[PAGE 2]]
本文采用如下约定。三维流形均为 closed oriented 3-manifold；link 默认嵌入 $S ^ { 3 }$ 中；从 Hopf algebra 出发时，表示范畴默认取有限秩表示。我们只讨论半单（或经 puri}cation后半单）的 modular category 构造，不涉及非半单的 Hennings、Lyubashenko 或 modi}edtrace 型推广。

记号大体沿用 Turaev 1994 年的教材 [T94]（以下简称 T94）。

## 2 Framed link 与 closed 3-manifold 的几何来源

## 2.1 Framing 与 writhe 的关系

设 L 是 $S ^ { 3 }$ 中的 oriented link。一个 framing 是 L 的法丛的一个平凡化，也就是沿每个分量取一个处处非零的法向量场并考虑其同伦类。对 $S ^ { 3 }$ 中的 oriented knot 而言，framing 可以用一个整数记录；这个整数可理解为给定 framing longitude 与 Seifertlongitude 的差。

在图示计算中，经常把 framing 转换成 writhe 的信息。具体地说，给定一个 linkdiagram D，blackboard framing 把每条线段加厚为贴近平面的 ribbon。此时 framing 由图中的 twisting 反映出来；给 diagram 加一个正 curl 或负 curl 会使 writhe 改变 ±1，同时也改变 blackboard framing。因而，在采用 blackboard framing 的约定下，可以用writhe 来代表 framing，并把 framed link 视为 ribbon link 的平面图示。

这一点解释了为什么 RT 构造自然使用 framed link 而不是普通 link：ribbon cate-gory 中的 twist 正是代数侧记录 framing 的结构。

## 2.2 四维 handlebody 视角

本文把四维 handlebody 视角作为 framed link 出现的主要几何来源。令 $B ^ { 4 }$ 是四维球，且 $\partial B ^ { 4 } = S ^ { 3 }$ 。若 $L = L _ { 1 } \cup \cdot \cdot \cdot \cup L _ { m }$ 是 $\partial B ^ { 4 }$ 中的 link，并给每个分量 $L _ { i }$ 指定一个整数 framing $n _ { i }$ ，则可以沿 L 的各分量附加 2-handles，得到四维 2-handlebody

$$
W _ { L } = B ^ { 4 } \cup _ { L } \bigcup _ { i } ( D ^ { 2 } \times D ^ { 2 } ) .
$$

这里每个 attaching map 的 framing 决定 $\vec { \mathrm { ~  ~ \int ~ } } \partial D ^ { 2 } \times D ^ { 2 }$ 如何贴到 $\partial B ^ { 4 }$ 的 tubular neigh-borhood 上。所得四维流形的边界 $\partial W _ { L }$ 是一个 closed oriented 3-manifold。

通常也把 $\partial W _ { L }$ 说成由 $S ^ { 3 }$ 沿 framed link L 做 integer Dehn surgery 得到的三维流形，并记为

$$
M _ { L } = S _ { L } ^ { 3 } ( n _ { 1 } , \dots , n _ { m } ) = \partial W _ { L } .
$$

本文不需要把 Dehn surgery 作为独立定义；只需记住它与上述 2-handle attachment 的边界描述等价。

定理 2.1 (Lickorish–Wallace surgery theorem). 任意 closed connected oriented 3-manifoldM 都有一个 integer surgery presentation：存在 $S ^ { 3 }$ 中的 link $L = L _ { 1 } \cup \cdot \cdot \cdot \cup L _ { m }$ 以及整

[[PAGE 3]]

数 framings $n _ { 1 } , \ldots , n _ { m }$ ，使得

$$
M \cong S _ { L } ^ { 3 } ( n _ { 1 } , \dots , n _ { m } ) .
$$

等价地，任意 closed connected oriented 3-manifold 都可由 $S ^ { 3 }$ 中某个 framed link 的 integer surgery 得到。

定理 2.2 (Rohlin cobordism theorem). 任意 closed oriented 3-manifold M 都是某个compact oriented 4-manifold W 的边界：

$$
\partial W = M .
$$

换言之，oriented cobordism group $\Omega _ { 3 } ^ { S O }$ 为 0。进一步地，我们可以要求 W 由 $B ^ { 4 }$ 附加2-handles 得到，即 $W = W _ { L }$ 。

上面两个定理是等价的。因此，若要构造 closed oriented 3-manifold invariant，可以从 framed link 出发。但 framed link 表示并不唯一，因此还需要处理不同 handle diagrams之间的等价关系。

## 2.3 Kirby calculus

Kirby calculus 描述了不同 framed links 何时给出同一个三维流形。它的几何含义是：改变四维 handle decomposition 的方式不应改变其边界三维流形。

定理 2.3 (Kirby calculus). 设 L 与 $L ^ { \prime }$ 是 $S ^ { 3 }$ 中的 framed links。则 $M _ { L }$ 与 $M _ { L ^ { \prime } }$ orientation-preservingly homeomorphic 当且仅当 L 与 L′ 可通过有限次 framed isotopy、handle slides以及 ±1-framed unknot 的加入或删除相互变换。

<!-- image-->  
图 1: Kirby moves 的局部示意：在 surgery diagram 中加入或删除特定 framed unknot，以及将一个分量沿另一个分量滑过，都不改变所得三维流形。

在 link diagram 中，handle slide 表现为一个分量沿另一分量做 band sum；±1 move表现为加入或删除一个与其余分量不交的 ±1-framed unknot。Turaev 在 RT 构造中使用的是等价版本的 Kirby moves。无论采用哪一套生成元，结论都是：若一个由 surgerylink 写出的数量要成为三维流形不变量，它必须在 Kirby moves 下保持不变。

## 3 Ribbon category 与 graphical calculus

## 3.1 Ribbon category 的定义

为了把 framed link diagram 转化成线性代数，需要一个能够解释 crossing、cup、cap与 twist 的范畴结构。我们分几步来搭：先是 monoidal category，再加上 braiding 和duality，最后把它们合起来得到 ribbon category。

[[PAGE 4]]

定义 3.1 (strict monoidal category). 本节采用 strict 约定。一个 strict monoidal categoryC 带有 bifunctor

$$
\otimes : { \mathcal { C } } \times { \mathcal { C } } \to { \mathcal { C } }
$$

和单位对象 1，满足

$$
( U \otimes V ) \otimes W = U \otimes ( V \otimes W ) , \qquad { \bf 1 } \otimes V = V = V \otimes { \bf 1 } .
$$

一般非 strict 的情形中，上式应改为 associativity 与 unit constraints；Mac Lane coherence允许我们在图示计算中按 strict 情形书写。

定义 3.2 (braiding). 设 C 是 strict monoidal category。一个 braiding 是一族对对象 V, W自然的同构

$$
c = \{ c _ { V , W } : V \otimes W \longrightarrow W \otimes V \} _ { V , W \in { \mathcal C } } ,
$$

满足两条 hexagon identity：

$$
c _ { U , V \otimes W } = ( \mathrm { i d } _ { V } \otimes c _ { U , W } ) \circ ( c _ { U , V } \otimes \mathrm { i d } _ { W } ) ,
$$

$$
c _ { U \otimes V , W } = ( c _ { U , W } \otimes \mathrm { i d } _ { V } ) \circ ( \mathrm { i d } _ { U } \otimes c _ { V , W } ) ,
$$

以及自然性：对任意 $f : V  V ^ { \prime } \ \Xi \ g : W  W ^ { \prime }$

$$
( g \otimes f ) \circ c _ { V , W } = c _ { V ^ { \prime } , W ^ { \prime } } \circ ( f \otimes g ) .
$$

配有 braiding 的 monoidal category 称为 braided monoidal category。

由定义立刻能得到两条常用事实。其一，在两条 hexagon identity 中取 $V = W = \mathbf { 1 }$ 以及 $U = V = \mathbf { 1 }$ ，再用 c 的可逆性，就有

$$
c _ { V , { \bf 1 } } = c _ { { \bf 1 } , V } = \mathrm { i d } _ { V } .
$$

其二，这些公理蕴含 Yang–Baxter（braid relation）恒等式

$$
\begin{array} { r } { ( \mathrm { i d } _ { W } \otimes c _ { U , V } ) \circ ( c _ { U , W } \otimes \mathrm { i d } _ { V } ) \circ ( \mathrm { i d } _ { U } \otimes c _ { V , W } ) = ( c _ { V , W } \otimes \mathrm { i d } _ { U } ) \circ ( \mathrm { i d } _ { V } \otimes c _ { U , W } ) \circ ( c _ { U , V } \otimes \mathrm { i d } _ { W } ) . } \end{array}
$$

[[PAGE 5]]

直观上， ${ \mathit { c } } _ { V , W }$ 是把 V -colored strand 从 W -colored strand 上方穿过去的代数解释：两条hexagon identity 保证 crossing 与张量积相容，而 Yang–Baxter 恒等式在图示上正好是三条 strand 的 Reidemeister III 同痕（见后面的 graphical calculus 一节）。

定义 3.3 (duality / rigid structure). 设 C 是 strict monoidal category。这里说的 duality，是给每个对象 V 指定一个对象 V∗ 以及两个态射

$$
b _ { V } : { \bf 1 } \to V \otimes V ^ { * } , \qquad d _ { V } : V ^ { * } \otimes V \to { \bf 1 } ,
$$

满足 zig-zag identities

$$
( \mathrm { i d } _ { V } \otimes d _ { V } ) \circ ( b _ { V } \otimes \mathrm { i d } _ { V } ) = \mathrm { i d } _ { V } ,
$$

$$
\left( d _ { V } \otimes \mathrm { i d } _ { V ^ { * } } \right) \circ \left( \mathrm { i d } _ { V ^ { * } } \otimes b _ { V } \right) = \mathrm { i d } _ { V ^ { * } } .
$$

这里 $b _ { V }$ 是 coevaluation， $d _ { V }$ 是 evaluation。具有这种 duality 的 monoidal category 常称为 rigid category。注意此处并不预先要求 $( V ^ { * } ) ^ { * } = V$ ；在 ribbon category 中，这一点会由兼容性给出一个 canonical identi}cation。

定义 3.4 (ribbon category). 一个 ribbon category 是一个 monoidal category C，配有braiding c、twist θ 以及与它们相容的 duality $( \mathbf { \Omega } ^ { * } , b , d )$ 。其中 twist 是一族自然同构

$$
\theta _ { V } : V \to V ,
$$

满足

$$
\theta _ { V \otimes W } = c _ { W , V } \circ c _ { V , W } \circ ( \theta _ { V } \otimes \theta _ { W } ) .
$$

duality 与 braiding、twist 之间的兼容性则要求

$$
\begin{array} { r } { ( \theta _ { V } \otimes \mathrm { i d } _ { V ^ { * } } ) \circ b _ { V } = ( \mathrm { i d } _ { V } \otimes \theta _ { V ^ { * } } ) \circ b _ { V } , } \end{array}
$$

[[PAGE 6]]

也就是常写成的 $\theta _ { V ^ { * } } = ( \theta _ { V } ) ^ { * }$ 。因此，ribbon category 正是能够同时解释 crossing、cup/cap和 framing twist 的范畴结构。

## 3.2 Colored ribbon graph

定义 3.5 (colored ribbon graph). 设 C 是一个 ribbon category。一个 ribbon graph 是三维流形中的紧定向曲面，分解为有限个 directed bands、directed annuli 和 coupons：bands可看作加厚的有向边，annuli 可看作加厚的闭边，coupons 是带有若干输入、输出边的矩形节点。一个 C-colored ribbon graph 是一个 ribbon graph，并附加如下标签：

1. 每条 directed band 或 annulus 标以 C 中的一个对象 V ；若方向反转，则颜色改为对偶对象 $V ^ { * }$ ；

2. 每个 coupon 标以 C 中的一个 morphism，其 source 和 target 分别由 coupon 下方、上方边界上相遇的 colored strands 的张量积给出；

3. isotopy 必须保持 ribbon graph 的分解、方向和 colors。

普通的 colored framed link 是最简单的例子：它没有 coupons，每个 link component被加厚为一个 annulus，并标以某个对象 $V \in { \mathcal { C } } _ { \mathfrak { c } }$ 。framing 被 annulus 的嵌入方式记录；这就是为什么 RT 构造自然处理 framed links 而不是 unframed links。

## 3.3 Graphical calculus

Graphical calculus 指的是把 colored ribbon graph 的平面图示系统地翻译成 C 中morphisms 的规则。具体地，先把图示切成局部生成元，再把它们替换为范畴中的结构态射：

<table><tr><td>图示局部构件</td><td>范畴解释</td></tr><tr><td>identity strand</td><td> $\operatorname { i d } _ { V }$ </td></tr><tr><td>positive/negative crossing</td><td> $c _ { V , W } \stackrel { \triangledown } { \lrcorner } \dot { \mathfrak { U } } c _ { V , W } ^ { - 1 }$ </td></tr><tr><td>cup/cap</td><td>coevaluation/evaluation</td></tr><tr><td>positive/negative twist</td><td> $\theta _ { V }$  或  $\cdot \theta _ { V } ^ { - 1 }$ </td></tr><tr><td>coupon</td><td>coupon 上标记的 morphism</td></tr></table>

[[PAGE 7]]

这些规则可以用下面几张图来读。一个带标签的 coupon 表示一个 morphism；多输入、多输出的 coupon 表示一般 morphism

$$
f : V _ { 1 } \otimes \cdots \otimes V _ { m } \longrightarrow W _ { 1 } \otimes \cdots \otimes W _ { n } .
$$

图元上下连接对应 morphism 的复合，并列放置对应 tensor product。

<!-- image-->

<!-- image-->  
图 2: Coupon 表示 morphism；一般 coupon 允许多个输入与多个输出。

<!-- image-->

<!-- image-->  
图 3: 水平并列表示 tensor product；改变 strand 的方向时，颜色改为对偶对象。

braiding 与 twist 是 framed link 图示中最重要的两个局部操作。Crossing 被读成${ \mathit { c } } _ { V , W }$ 或 $c _ { V , W } ^ { - 1 } ; \ - \vert \overrightarrow { \Xi } \vert \overrightarrow { \mathrm { I } }$ 负 twist 被读成 $\theta _ { V }$ 或 $\theta _ { V } ^ { - 1 }$ 。因此，framing 的改变不是额外信息，而是已经由 ribbon category 的 twist 记录在代数中。

<!-- image-->  
图 4: Crossing 对应 braiding；ribbon 的正负扭转对应 twist 及其逆。

同痕变形的代数化，就是把“图可以连续拉动而不改变 isotopy class”翻译成范畴公理。比如，strand 穿过一个 tensor product 的两种画法相同，对应 braiding 的 hexagonidentity

$$
c _ { U , V \otimes W } = ( \mathrm { i d } _ { V } \otimes c _ { U , W } ) \circ ( c _ { U , V } \otimes \mathrm { i d } _ { W } ) .
$$

图形上，这正是把 U 同时穿过 $V \otimes W$ ，或先穿过 V 再穿过 W，所得图示同痕。

<!-- image-->  
图 5: Braiding 的 hexagon identity 是 crossing 与 tensor product 相容性的图示版本。

三条 strand 的 Reidemeister III 型同痕对应 Yang–Baxter identity：

$$
\begin{array} { r l } & { ( \mathrm { i d } _ { W } \otimes c _ { U , V } ) \circ ( c _ { U , W } \otimes \mathrm { i d } _ { V } ) \circ ( \mathrm { i d } _ { U } \otimes c _ { V , W } ) } \\ & { \qquad = ( c _ { V , W } \otimes \mathrm { i d } _ { U } ) \circ ( \mathrm { i d } _ { V } \otimes c _ { U , W } ) \circ ( c _ { U , V } \otimes \mathrm { i d } _ { W } ) . } \end{array}
$$

[[PAGE 8]]

这解释了为什么一个 braiding 不只是任意的交换同构，而必须满足 braid relation。

<!-- image-->  
图 6: Yang–Baxter identity 是三条 colored strands 的 Reidemeister III 型同痕。

类似地，morphisms 可以沿着 crossing 滑动，这对应 braiding 的自然性：

$$
( g \otimes f ) \circ c _ { V , W } = c _ { V ^ { \prime } , W ^ { \prime } } \circ ( f \otimes g ) .
$$

Cup 与 cap 的拉直则对应 duality 的 zig-zag identities：

$$
\bigl ( \mathrm { i d } _ { V } \otimes d _ { V } \bigr ) \circ \bigl ( b _ { V } \otimes \mathrm { i d } _ { V } \bigr ) = \mathrm { i d } _ { V } , \qquad \bigl ( d _ { V } \otimes \mathrm { i d } _ { V ^ { * } } \bigr ) \circ \bigl ( \mathrm { i d } _ { V ^ { * } } \otimes b _ { V } \bigr ) = \mathrm { i d } _ { V ^ { * } } .
$$

<!-- image-->  
图 7: Naturality 允许 coupon 穿过 crossing；cup/cap 由 coevaluation/evaluation 给出，zig-zag identities 允许它们被拉直。

最后，把这些局部规则拼起来，就可以解释带 coupons 的 ribbon graph。ribboncategory 的公理正是保证这种翻译不依赖于图示切分方式，并且在 ribbon isotopy 下保持不变的代数条件。

<!-- image-->  
图 8: 一般 ribbon graph 由 strands、crossings、twists、cups/caps 和 coupons 拼接而成。

## 3.4 Trace 与 dimension

ribbon category 中的 trace 是一个图形化的 trace，而不是一开始就给定的矩阵trace。设 $f : V \to V$ 是 C 中的 endomorphism。记

$$
b _ { V } : { \mathbf { 1 } } \to V \otimes V ^ { * } , \qquad d _ { V } : V ^ { * } \otimes V \to { \mathbf { 1 } }
$$

为 coevaluation 和 evaluation。Turaev 的 categorical trace 定义为

$$
\operatorname { t r } c ( f ) = d _ { V } \circ c _ { V , V ^ { * } } \circ ( ( \theta _ { V } \circ f ) \otimes \operatorname { i d } _ { V ^ { * } } ) \circ b _ { V } \in \operatorname { E n d } _ { \mathcal { C } } ( { \bf 1 } ) .
$$

[[PAGE 9]]

对象 V 的 categorical dimension 定义为

$$
\dim _ { \mathcal { C } } ( V ) = \operatorname { t r } _ { \mathcal { C } } ( \operatorname { i d } _ { V } ) .
$$

图形上， $\operatorname { t r } c ( f )$ 就是把一个标有 f 的 coupon 放到一条 V -colored closed ribbon 上后得到的 closed ribbon graph invariant。也就是说，若 $\Omega _ { f }$ 表示这个闭合图形，则

$$
F ( \Omega _ { f } ) = \operatorname { t r } c ( f ) .
$$

定理 3.6 (Turaev ribbon graph functor). 对任意 ribbon category C，存在一个拓扑不变量函子 F ，它把 C-colored ribbon graphs 映到 C 中的 morphisms。若 Γ 是 closed coloredribbon graph，则

$$
F ( \Gamma ) \in { \mathrm { E n d } } c ( \mathbf { 1 } ) .
$$

在 $\mathrm { E n d } _ { \mathscr { C } } ( { \bf 1 } ) = { \cal K }$ 的情形下，F(Γ) 是 K 值不变量。

这个定理是 graphical calculus 的严格表述。它说明，只要范畴结构满足 ribboncategory 的公理，局部图元的代数解释就自动对 Reidemeister 型局部变形不变。

## 4 Hopf 代数如何产生 ribbon category

本节主线是：Hopf algebra A 的每一层代数结构，恰好在表示范畴 Rep(A) 上诱导一层范畴结构，从而逐步把 Rep(A) 提升为 ribbon category（与拓扑侧的完整对照见第9 节）。

<table><tr><td>A上的结构</td><td>Rep(A）上的结构</td><td>图示</td></tr><tr><td>bialgebra :  $\Delta , \varepsilon$ </td><td>monoidal（张量积、单位）并列strands</td><td></td></tr><tr><td>Hopf: antipode S</td><td>rigid / duality</td><td>cup、cap</td></tr><tr><td>quasitriangular: R-matrixbraiding c</td><td></td><td>crossing</td></tr><tr><td>ribbon: universal twist u</td><td>twist 0</td><td>framing</td></tr></table>

设 A 是一个 Hopf algebra，结构映射为乘法、单位、coproduct $\Delta ,$ 、counit $\varepsilon$ 与 antipode$S _ { \textrm { c } }$ 。若 V 与 $W$ 是左 A-modules，则 $V \otimes W$ 上的 A-作用由 $\Delta$ 给出：

$$
a \cdot ( v \otimes w ) = \sum a _ { ( 1 ) } v \otimes a _ { ( 2 ) } w , \qquad \Delta ( a ) = \sum a _ { ( 1 ) } \otimes a _ { ( 2 ) } .
$$

[[PAGE 10]]

因此 Rep(A) 是 monoidal category。

antipode 的作用是构造 dual modules。设 V 是有限秩左 A-module，并记

$$
V ^ { * } = \operatorname { H o m } _ { K } ( V , K ) .
$$

有两种自然的左 A-module 结构：

$$
( a \cdot f ) ( v ) = f ( S ( a ) v ) ,
$$

以及

$$
( a \cdot f ) ( v ) = f ( S ^ { - 1 } ( a ) v ) ,
$$

其中第二个公式要求 $S$ 可逆。第一种结构使 evaluation $V ^ { * } \otimes V \to K$ 与 coevaluation$K  V \otimes V ^ { * }$ 成为 A-linear maps；第二种结构则对应另一侧的 duality。换言之，antipode是 cup 与 cap 可以被解释为 A-linear morphisms 的代数原因。

这里的 A-linearity 可以直接检查。把 K 看成 counit 给出的平凡 A-module，即$\boldsymbol a \cdot \boldsymbol c = \varepsilon ( a ) c _ { \circ }$ 令

$$
d _ { V } : V ^ { * } \otimes V \to K , \qquad d _ { V } ( f \otimes x ) = f ( x ) .
$$

则

$$
\begin{array} { l } { { d _ { V } \displaystyle \big ( { a \cdot ( f \otimes x ) } \big ) = \sum d _ { V } \big ( { a _ { ( 1 ) } f \otimes a _ { ( 2 ) } x } \big ) } } \\ { { \displaystyle \qquad = \sum f \big ( { \cal S } ( a _ { ( 1 ) } ) a _ { ( 2 ) } x \big ) = \varepsilon ( a ) f ( x ) , } } \end{array}
$$

所以 $d _ { V }$ 是 A-linear。若 $\left\{ \boldsymbol { e } _ { i } \right\}$ 是 V 的一组基， $\{ e ^ { i } \}$ 是对偶基，则

$$
b _ { V } : K  V \otimes V ^ { * } , \qquad b _ { V } ( 1 ) = \delta _ { V } = \sum _ { i } e _ { i } \otimes e ^ { i }
$$

也为 A-linear。事实上，将 $V \otimes V ^ { * }$ 识别为 $\operatorname { E n d } _ { K } ( V )$ 时， $\delta _ { V }$ 对应 $\operatorname { i d } _ { V }$ ；而 a 作用在 $\delta _ { V }$ 上对应算子

$$
z \longmapsto \sum _ { i } e ^ { i } ( S ( a _ { ( 2 ) } ) z ) a _ { ( 1 ) } e _ { i } = \sum a _ { ( 1 ) } S ( a _ { ( 2 ) } ) z = \varepsilon ( a ) z .
$$

[[PAGE 11]]

因此 $\boldsymbol a \cdot \delta _ { V } = \varepsilon ( \boldsymbol a ) \delta _ { V }$ ，即 $b _ { V } ( a \cdot 1 ) = a \cdot b _ { V } ( 1 )$ 。

需要注意，有限维向量空间的标准映射

$$
j _ { V } : V  V ^ { * * } , \qquad j _ { V } ( x ) ( f ) = f ( x )
$$

一般并不是 A-module isomorphism。事实上

$$
( a \cdot j _ { V } ( x ) ) ( f ) = j _ { V } ( x ) ( S ( a ) f ) = f ( S ^ { 2 } ( a ) x ) = j _ { V } ( S ^ { 2 } ( a ) x ) ( f ) .
$$

因此 jV 只在 $S ^ { 2 } =$ id 的特殊情形下自动是 A-linear。若 A 是 ribbon Hopf algebra，则Drinfeld element $u = m ( S \otimes \mathrm { i d } ) ( R _ { 2 1 } )$ 与 universal twist v 给出与 quantum trace 相容的pivotal element

$$
g = u v , \qquad S ^ { 2 } ( a ) = g a g ^ { - 1 } .
$$

这时真正的 A-module isomorphism $V  V ^ { * * }$ 是

$$
p _ { V } ( x ) ( f ) = f ( g x ) = j _ { V } ( g x ) ( f ) .
$$

因为

$$
\begin{array} { c l c r } { { ( a \cdot p _ { V } ( x ) ) ( f ) = p _ { V } ( x ) ( S ( a ) f ) = f ( S ^ { 2 } ( a ) g x ) } } \\ { { } } & { { } } \\ { { } } & { { = f ( g a x ) = p _ { V } ( a x ) ( f ) . } } \end{array}
$$

这也解释了为什么 quantum trace 中会出现同一个因子 $g = u v _ { \mathrm { ~ c ~ } }$ 。（有些文献把 $r = v ^ { - 1 }$ 称为 ribbon element，于是同一个因子写成 $u r ^ { - 1 }$ ；为避免来回切换，下文一律用 $v _ { \circ } )$

左对偶与右对偶的差别来自 evaluation/coevaluation 放在 V 的哪一侧。在一般刚性 monoidal category 中，左对偶和右对偶不必相同；在 ribbon Hopf algebra 的表示范畴中，由于 ribbon 结构给出 compatible pivotal structure，左右对偶被系统地联系起来。这就是 framed oriented tangle 中方向反转与对偶颜色可以一致处理的原因。

定义 4.1 (quasitriangular Hopf algebra). 一个 quasitriangular Hopf algebra 是一个 Hopfalgebra A，配有可逆元

[[PAGE 12]]

$$
R = \sum R ^ { ( 1 ) } \otimes R ^ { ( 2 ) } \in A \otimes A ,
$$

称为 universal R-matrix，使得

$$
R \Delta ( a ) R ^ { - 1 } = \Delta ^ { \mathrm { o p } } ( a ) ,
$$

并且

$$
( \Delta \otimes \mathrm { i d } ) ( R ) = R _ { 1 3 } R _ { 2 3 } , \qquad ( \mathrm { i d } \otimes \Delta ) ( R ) = R _ { 1 3 } R _ { 1 2 } .
$$

这些恒等式保证 R 与 coproduct 相容，并推出 Yang–Baxter equation。

若 $V , W$ 是 A-modules，则 R 定义 braiding

$$
c _ { V , W } = P \circ ( \rho _ { V } \otimes \rho _ { W } ) ( R ) : V \otimes W \to W \otimes V ,
$$

其中 $P$ 是交换两个张量因子的 \~ip。Yang–Baxter equation 正是 braid relations 的代数形式。因此 universal R-matrix 是 crossing 的代数来源。

定义 4.2 (ribbon Hopf algebra). 一个 ribbon Hopf algebra 是 quasitriangular Hopf algebra(A, R)，再配有 central invertible element $v \in A$ ，Turaev 称之为 universal twist，使它满足

$$
\Delta ( v ) = R _ { 2 1 } R ( v \otimes v ) , \qquad S ( v ) = v , \qquad \varepsilon ( v ) = 1 ,
$$

其中 $R _ { 2 1 } = P _ { A } ( R )$ 是交换两个张量因子后的 R-matrix。如前所述，文献里也常把 $v ^ { - 1 }$ 称为 ribbon element，那时上面的 coproduct 公式会带一个 $( R _ { 2 1 } R ) ^ { - 1 }$ 因子。

命题 4.3. 若 A 是 ribbon Hopf algebra，则有限维表示范畴 $\mathrm { R e p } _ { \mathrm { f d } } ( A )$ 是 ribbon category。其 braiding 由 universal R-matrix 给出，twist 则由 universal twist 的作用给出：

$$
\theta _ { V } = \rho _ { V } ( v ) : V \to V .
$$

这说明 Hopf algebra 并不是直接“描述 framed link”，而是通过其表示范畴给出ribbon category，再由 Turaev 的 graphical calculus 得到 colored framed link invariant。

现在可以解释几种 trace 的关系。普通 trace TrV 是有限维向量空间 V 上线性算子的矩阵 trace。quantum trace 则是先用 ribbon Hopf algebra 的 canonical element 把ordinary trace 修正一下、再取 trace：

[[PAGE 13]]

$$
\mathrm { t r } _ { q } ( f ) = \mathrm { T r } _ { V } ( \rho _ { V } ( u v ) \circ f ) ,
$$

其中 $u = m ( S \otimes \mathrm { i d } ) ( R _ { 2 1 } )$ 是 Drinfeld element。于是

$$
\dim _ { q } ( V ) = \operatorname { t r } _ { q } ( \operatorname { i d } _ { V } ) = \operatorname { T r } _ { V } ( \rho _ { V } ( u v ) ) .
$$

另一方面，上一节定义的 categorical trace $\operatorname { t r } c ( f )$ 是图形闭合得到的 morphism $\mathbf { 1 }  \mathbf { 1 }$ 。当 ${ \mathcal { C } } = \operatorname { R e p } _ { \operatorname { f d } } ( A )$ 时，把 braiding、duality 和 twist 的具体公式代入 categorical trace，正好得到上面的 quantum trace：

$$
\operatorname { t r } _ { \mathrm { R e p } ( A ) } ( f ) = \operatorname { t r } _ { q } ( f ) .
$$

因此三种写法并不矛盾：ordinary trace 是线性代数操作；quantum trace 是 Hopf algebra表示里的 ordinary trace 加权版本；categorical trace 是同一个量的 coordinate-free 图形化定义。

## 5 Colored framed link invariant

设 A 是 ribbon Hopf algebra， ${ \underset { \vec { \times } } {  } } ~ { \mathcal { C } } = \operatorname { R e p } _ { \mathrm { f d } } ( A )$ 。给定 oriented framed link

$$
L = L _ { 1 } \cup \dots \cup L _ { m } ,
$$

并给每个分量 $L _ { i }$ 指定一个 color $V _ { i } \in \mathcal { C }$ ，Turaev functor 给出标量

$$
F ( L ; V _ { 1 } , \ldots , V _ { m } ) \in { \mathrm { E n d } } _ { { \mathcal { C } } } ( \mathbf { 1 } ) .
$$

若 $\mathrm { E n d } _ { \mathscr { C } } ( { \bf 1 } ) = { \cal K }$ ，则这就是 K 值的 colored framed link invariant。

这里必须强调“framed”。在 ribbon category 中，正负 twist 分别由 $\theta _ { V }$ 及其逆表示；因此 link component 的 framing 改变会改变 invariant。若采用 blackboard framing，则diagram 的 writhe 可以用来编码 framing；这正是 framed link 与 ribbon diagram 对应的图示基础。

[[PAGE 14]]

## 6 从 link invariant 到三维流形不变量

上一节得到的 $F ( L ; V _ { 1 } , \ldots , V _ { m } )$ 只是 colored framed link invariant。要由它定义 $M _ { L }$ 的不变量，必须消除 surgery presentation 的非唯一性。按照 Kirby 定理，需要构造一个表达式 τ (L)，使其在 handle slides 与 $\pm 1 \mathrm { { \ m o v e s } }$ 下不变。

实现这一点的结构是 modular category。下文把它写成

$$
( \gamma , \{ V _ { i } \} _ { i \in I } ) ,
$$

其 ground ring 为 K。

定义 6.1 (modular category). 一个 modular category 是一个 ribbon K-linear category V，连同有限个 simple objects 的代表集 $\{ V _ { i } \} _ { i \in I }$ ，满足以下条件：

1. 单位对象属于这组 simples，即存在 $0 \in I$ 使得 $V _ { 0 } = \mathbf { 1 }$

2. 对偶封闭：对每个 $i \in I$ ，存在 $i ^ { * } \in I$ 使得 $V _ { i ^ { * } } \cong V _ { i } ^ { * }$

3. domination：每个对象 X 的 identity morphism 都可写成有限和

$$
\mathrm { i d } _ { X } = \sum _ { r } f _ { r } g _ { r } ,
$$

其中 $g _ { r } : X \to V _ { i ( r ) } , \ f _ { r } : V _ { i ( r ) } \to X , \ { \textrm { H } } i ( r ) \in I$

4. Hopf link matrix

$$
S _ { i j } = \mathrm { t r } ( c _ { V _ { j } , V _ { i } } \circ c _ { V _ { i } , V _ { j } } )
$$

在 $K$ 上可逆。

前三条条件表达“有限 simple colors 足够控制整个范畴”；最后一条 non-degeneracy条件是 modularity 的核心，它使 Kirby color 具有 handle-slide 不变性。记

$$
\dim ( i ) = \dim ( V _ { i } ) , \qquad S _ { i j } = \operatorname { t r } ( c _ { V _ { j } , V _ { i } } \circ c _ { V _ { i } , V _ { j } } ) ,
$$

其中 $S _ { i j }$ 是 Hopf link matrix。若 twist 在 simple object $V _ { i }$ 上的标量为 $v _ { i }$ ，则 Turaev 还引入

$$
D ^ { 2 } = \sum _ { i \in I } \dim ( i ) ^ { 2 } , \qquad \Delta = \sum _ { i \in I } v _ { i } ^ { - 1 } \dim ( i ) ^ { 2 } .
$$

这里 D 称为 rank； $\Delta$ 是由 twist anomaly 决定的常数。

[[PAGE 15]]

定义 6.2 (Kirby color). Kirby color 是形式线性组合

$$
\Omega _ { \mathcal { V } } = \sum _ { i \in I } \mathrm { d i m } ( i ) V _ { i } .
$$

若 L 有 m 个分量，把每个分量都染成 $\Omega _ { \nu }$ ，意思是取 Turaev 的加权求和

$$
\{ L \} = \sum _ { \lambda \in \coth ( L ) } \left( \prod _ { n = 1 } ^ { m } \dim ( \lambda ( L _ { n } ) ) \right) F ( \Gamma ( L , \lambda ) ) .
$$

这里 col(L) 是从 L 的分量集合到 I 的所有 coloring，Γ(L, λ) 是对应的 colored ribbongraph。 $\Omega _ { \nu }$ 不是范畴中的普通对象，而是 surgery coloring sum 的记号。

Kirby color 的核心性质是 handle-slide property：一个 strand 在 $\Omega _ { \nu } { \mathrm { - c o l o r e d } }$ compo-nent 上滑过，不改变整体加权求和。这一性质的代数来源可以理解为 Hopf link S-matrix的非退化性和 quantum dimensions 的配合；几何上，它正是 Kirby handle slide 的不变性。

设 $B _ { L }$ 是 framed link L 的 linking matrix。对角元为 framing，非对角元为 pairwiselinking numbers。记

$$
\sigma ( L ) = \sigma _ { + } ( L ) - \sigma _ { - } ( L )
$$

为 $B _ { L }$ 的 signature；等价地，它是 Turaev 的四维 $W _ { L }$ 的 intersection form signature。  
Kirby 的 ±1 move 会改变 signature，因此 {L} 本身通常不是三维流形不变量。

T94 Chapter II 的归一化公式是

$$
\tau _ { \mathcal { V } , D } ( M _ { L } ) = \Delta ^ { \sigma ( L ) } D ^ { - \sigma ( L ) - m - 1 } \{ L \} .
$$

这里 m 是 surgery link 的分量数。该公式的 normalization 给出 $\tau _ { \mathcal { V } , D } ( S ^ { 3 } ) = D ^ { - 1 }$ 和$\tau _ { \mathscr { V } , D } ( S ^ { 1 } \times S ^ { 2 } ) = 1$ 。不同文献可能把 D 或 $\Delta$ 吸收到整体常数中；关键结构事实不变：Kirby color 保证 handle slide 不变性， $\Delta$ 与 signature/rank normalization 保证 ±1 move不变性。

定理 6.3 (Reshetikhin–Turaev invariant). 设 $( \mathcal { V } , \{ V _ { i } \} _ { i \in I } )$ 是 modular category，并选定rank $D _ { \circ }$ 。由 Kirby color 加权求和和 signature 归一化得到的数量 $\tau _ { \mathcal { V } , D } ( M _ { L } )$ 在 Kirbymoves 下不变。因此它只依赖于 closed oriented 3-manifold $M _ { L }$ 的 orientation-preservinghomeomorphism class，给出三维流形不变量

[[PAGE 16]]

$$
\tau _ { \mathcal { V } , D } ( M ) \in K .
$$

更一般地，若 closed 3-manifold M 中含有 V-colored framed ribbon graph Γ，同样可以定义 pair invariant $\tau _ { \mathcal { V } , D } ( M , \Gamma )$ 。

## 7 Modular Hopf algebra 与 puri}cation

T94 Chapter XI 先在 Hopf 代数层面定义 modular Hopf algebra，再通过表示范畴与 puri}cation 得到 modular category。本节记录这一步的具体形式。

定义 7.1 (negligible module). 设 A 是 ribbon Hopf algebra，Z 是有限秩 A-module。若对任意 A-linear endomorphism f : $Z \to Z$ 都有

$$
\mathrm { t r } _ { q } ( f ) = 0 ,
$$

则称 Z 是 negligible module。等价地，idZ 的 quantum trace 为零，并且经过 Z 的morphisms 在 puri}cation 中会被商掉。

定义 7.2 (modular Hopf algebra). 一个 modular Hopf algebra 是一个 ribbon Hopf K-algebra A，连同一族有限秩 simple A-modules $\{ V _ { i } \} _ { i \in I }$ ，满足：

1. 存在 $0 \in I$ ，使 $V _ { 0 } = K$ ，其中 A 通过 counit 作用在 K 上；

2. 对每个 $i \in I$ ，存在 $i ^ { * } \in I$ ，使 $V _ { i ^ { * } } \cong V _ { i } ^ { * }$

3. 对任意 $k , l \in I$ ，张量积 $V _ { k } \otimes V _ { l }$ 可分解为有限个 $V _ { i }$ 的直和，加上一个 negligibleA-module；

4. 由 monodromy $R _ { 2 1 } R$ 给出的 Hopf link matrix

$$
S _ { i j } = \mathrm { t r } _ { q } \big ( ( R _ { 2 1 } R ) | _ { V _ { i } \otimes V _ { j } } \big )
$$

在 K 上可逆。

这个定义是 modular category 公理在 Hopf algebra 表示论中的对应版本。单位对象、对偶闭合和 tensor product 分解对应 modular category 的前三条公理；S-matrix可逆对应 non-degeneracy。区别是：在 quantum group at roots of unity 中确实会出现negligible modules，因此 Rep(A) 的相应子范畴一般首先是 quasimodular category，而不是已经纯粹的 modular category。

[[PAGE 17]]

定理 7.3 (Turaev). 设 (A, {Vi}) 是 modular Hopf algebra。由 {Vi} quasidominate 的 A-modules 构成 Rep(A) 的一个 ribbon 子范畴 T 。则 $( \mathcal { T } , \{ V _ { i } \} )$ 是 quasimodular category。将 T 按 negligible morphisms 取 quotient，即 puri}cation，得到 modular category $\mathcal { T } _ { p }$ 。于是每个 modular Hopf algebra canonically gives rise to a modular category。

因此，在 T94 的层级中，modular Hopf algebra 是产生 quasimodular category 的Hopf-algebraic input；puri}cation 是从这个 quasimodular category 到 modular category的一步：

modular Hopf algebra −→ quasimodular category

−→ puri}ed modular category

−→ RT invariant.

## 8 $U _ { q } ( \mathfrak { s l } _ { 2 } )$ 、Jones polynomial 与 WRT invariant

最后说明本文主线如何包含 Jones polynomial。这里要区分 generic parameter 与root of unity 两种情形。T94 Chapter XI §7.5 讨论的是 generic 或 h-adic 情形：由 $U _ { h } { \mathfrak { g } }$ 的 regular }nite-rank modules 组成 ribbon category。一个 indecomposable regular module由最高权标号，而这些最高权等价于 m = rank g 个非负整数。因此，若

$$
L = L _ { 1 } \cup \dots \cup L _ { s }
$$

是 framed oriented link，给每个分量指定一个最高权

$$
L _ { j } \longmapsto V _ { \lambda _ { j } }
$$

就得到一个 colored framed link。把这个 colored link 代入 Chapter I 的 operator invariantF，得到

$$
F ( L ; V _ { \lambda _ { 1 } } , \dots , V _ { \lambda _ { s } } ) \in \mathbb { C } [ [ h ] ] .
$$

T94 §7.5 指出，这个不变量实际上是变量

$$
q = \exp ( - h / 2 )
$$

的 Laurent polynomial。

当 ${ \mathfrak { g } } = { \mathfrak { s l } } _ { 2 } ( \mathbb { C } )$ 时，rank 为 1，indecomposable regular modules 由一个非负整数标号：

$$
V _ { 0 } , V _ { 1 } , V _ { 2 } , \dots .
$$

这里 $V _ { n }$ 是最高权为 n 的表示，经典维数为 $n + 1 \mathrm { { \ell } } _ { \mathrm { { { o } } } }$ 因此，对 knot K，每个 $n \geq 0$ 都给出一个 framed colored link polynomial

[[PAGE 18]]

$$
F ( K ; V _ { n } ) .
$$

这些就是 colored Jones polynomial 的 quantum-group 来源。特别地， $V _ { 1 }$ 是二维基本表示；T94 §7.5 说明，当 link 的所有分量都染成 ${ \mathfrak { s l } } _ { 2 }$ 的基本表示时，得到的 F 是 Jonespolynomial 的一个版本。对 $n > 1$ ，得到的是 higher colored Jones polynomials。

还需注意，operator invariant F 首先是 framed link invariant。若从一个普通 orientedlink diagram D 出发，通常先采用 blackboard framing，把 D 看成 framed link diagram，再给每个分量染成 $V _ { 1 }$ ，计算

$$
F ( D ; V _ { 1 } , \ldots , V _ { 1 } ) .
$$

这个量在 Reidemeister II、III 型变形下表现良好，但 Reidemeister I 会改变 blackboardframing。要得到普通 oriented link invariant，需要用 diagram 的 writhe 做归一化，抵消 twist eigenvalue 带来的 framing dependence。换言之，

$$
\mathrm { J o n e s \ p o l y n o m i a l = w r i t h e - n o r m a l i z e d \ } F ( D ; V _ { 1 } , \ldots , V _ { 1 } ) ,
$$

其中变量替换和整体常数依 convention 而不同。T94 Chapter XII 从 Kauzman bracketviewpoint 给出同一现象：bracket 是 framed link invariant，乘以 writhe 修正因子后得到 ordinary oriented Jones polynomial。

在 root of unity 情形，需要把允许的 colors 截断到有限的 Weyl alcove simple mod-ules。T94 说明，对于满足相应阶数条件的 q，可以从 $U _ { q } ( { \mathfrak { g } } )$ 得到 modular Hopf algebra；经过 puri}cation 得到 modular category 后，再应用第 6 节所总结的 surgery construction，就得到 Witten–Reshetikhin–Turaev 型 3-manifold invariants。

因此，三者的逻辑关系是：

1. generic/h-adic 的 $U _ { q } ( \mathfrak { s l } _ { 2 } )$ 给出 colored Jones polynomials；

2. 颜色 $V _ { 1 }$ ，也就是二维基本表示，给出 ordinary Jones polynomial 的一个归一化版本；

3. root of unity 下的有限 modular data 经过 surgery/Kirby normalization 给出 WRT3-manifold invariants。

[[PAGE 19]]

## 9 结构表

<table><tr><td>Hopf 代数结构</td><td>代数数据</td><td>表示范畴中的结构</td><td>拓扑解释</td></tr><tr><td>algebra</td><td>multiplication, unit</td><td>A-modules 与 A-linear maps</td><td>只有表示论，还不能自然 解释并列strands</td></tr><tr><td>bialgebra</td><td>coproduct, counit</td><td>monoidal category</td><td>解释 tensor product，即多 条线并列</td></tr><tr><td>Hopf algebra</td><td>antipode</td><td>rigid category / duality</td><td>解释cup、cap、orientation reversal</td></tr><tr><td>quasitriangular Hopf algebra</td><td>universal R-matrix</td><td>braided category</td><td>解释crossing</td></tr><tr><td>ribbon Hopf algebra</td><td>universal twist</td><td>ribbon category</td><td>解释 twist与 framing</td></tr><tr><td>modular Hopf</td><td>finite simple colors，quasimodular</td><td></td><td>通过 Kirby color 与 signa-</td></tr><tr><td>algebra</td><td>quantum</td><td>category;</td><td>ture 归一化得到三维流形</td></tr><tr><td></td><td>dimensions,</td><td>purification 后为</td><td>不变量</td></tr><tr><td></td><td>negligible</td><td>invertible S-matrix,modular category</td><td></td></tr></table>

表 1: 从 Hopf 代数结构到拓扑构造的对应关系

## 参考文献

[RT1] N. Reshetikhin and V. Turaev, Ribbon graphs and their invariants derived from quantum groups, Communications in Mathematical Physics 127 (1990), 1–26.

[RT2] N. Reshetikhin and V. Turaev, Invariants of 3-manifolds via link polynomials and quantum groups, Inventiones Mathematicae 103 (1991), 547–597.

[T94] V. G. Turaev, Quantum Invariants of Knots and 3-Manifolds, de Gruyter, 1994.

[Ki] R. Kirby, A calculus of framed links in $S ^ { 3 }$ , Inventiones Mathematicae 45 (1978), 35–56.