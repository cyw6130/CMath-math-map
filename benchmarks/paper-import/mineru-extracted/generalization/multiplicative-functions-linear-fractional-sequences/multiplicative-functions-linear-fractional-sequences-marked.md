[[PAGE 1]]
# VALUE DISTRIBUTION OF MULTIPLICATIVE FUNCTIONS ALONG LINEAR FRACTIONAL SEQUENCES

SUN-KAI LEUNG

Abstract. For $a , c \in \mathbb { N }$ and $b , d \in \mathbb { Z }$ such that the (non-empty) set

$$
R _ {a, b, c, d} := \left\{\frac {a n + b}{c n + d}: n \in \mathbb {N} \right\} \cap \left(\mathbb {Q} _ {> 0} \setminus \{1 \}\right)
$$

is multiplicatively recurrent, we give a complete characterization of the set of limit points of every unimodular multiplicative function $f \in \mathcal { M }$ along $R _ { a , b , c , d }$ . We show that the possible limit sets are either the finite subgroups of the unit circle or the entire circle, thereby extending the dichotomy of Klurman–Mangerel.

## 1. Introduction

Denote the set of unimodular completely multiplicative functions by

$$
\mathcal {M} := \{f: \mathbb {Q} _ {> 0} \to \mathbb {T}: f (r s) = f (r) f (s) \text {   for   } r, s \in \mathbb {Q} _ {> 0} \},
$$

which can be identified with the Pontryagin dual of the group of positive rationals $( \mathbb { Q } _ { > 0 } , \times )$ . By the pigeonhole principle, for every $f \in \mathcal { M }$ and $\epsilon > 0$ , there exist infinitely many rational numbers $r \in \mathbb { Q } _ { > 0 }$ such that

$$
\left| f (r) - 1 \right| <   \epsilon ,
$$

which can be viewed as the multiplicative analogue of Dirichlet’s approximation theorem. It is then natural to restrict this approximation problem to a thin subset of $\mathbb { Q } _ { > 0 }$

In this direction, Klurman and Mangerel [KM18] showed that for every $f \in \mathcal { M }$ , we have

$$
\operatorname * {l i m i n f} _ {n \to \infty} \left| f \left(\frac {n + 1}{n}\right) - 1 \right| = 0.\tag{1.1}
$$

Let $a , c \in \mathbb { N }$ and $b , d \in \mathbb { Z }$ . As a generalization, Charamaras, Mountakis, and Tsinas [CMT25] showed that

$$
\operatorname * {l i m i n f} _ {n \to \infty} \left| f \left(\frac {a n + b}{c n + d}\right) - 1 \right| = 0\tag{1.2}
$$

for every $f \in \mathcal { M }$ if and only if $a = c$ and either $b = d$ or $a \mid \operatorname { l c m } ( b , d ) . ^ { 1 }$ See $\mathrm { [ D o n + 2 3 }$ Corollary 1.7] for the case where $a = c$ and either $a \mid b$ or $a \mid d .$

For $a , c \in \mathbb { N }$ and $b , d \in \mathbb { Z }$ , define

$$
R _ {a, b, c, d} := \left\{\frac {a n + b}{c n + d}: n \in \mathbb {N} \right\} \cap (\mathbb {Q} _ {> 0} \setminus \{1 \}).
$$

Recently, T´afula and the author [LT25] proved that the set $R _ { a , b , c , d } ,$ , if non-empty, is multiplicatively recurrent (see, for instance, [LT25] for the definition) if and only if $a = c$ and $a \mid \operatorname { l c m } ( b , d )$ . In particular, for every $f _ { 1 } , \dots , f _ { r } \in \mathcal { M }$ , we have

[[PAGE 2]]
$$
\operatorname * {l i m i n f} _ {n \to \infty} \max _ {1 \leqslant j \leqslant r} \left| f _ {j} \left(\frac {a n + b}{a n + d}\right) - 1 \right| = 0,
$$

thereby extending the aforementioned result of Charamaras, Mountakis, and Tsinas to simultaneous approximation.

For a sequence of complex numbers $\left( z _ { n } \right)$ , we denote its set of limit points by

$$
\omega (z _ {n}) := \bigcap_ {N = 1} ^ {\infty} \overline {{\{z _ {n} : n \geqslant N \}}}.
$$

Also, for $k \in \mathbb N$ , we denote the group of k-th roots of unity by

$$
\mu_ {k} := \{z \in \mathbb {T}: z ^ {k} = 1 \}.
$$

More precisely, Klurman and Mangerel [KM18] showed that

$$
\omega \left(f \left(\frac {n + 1}{n}\right)\right) = \left\{ \begin{array}{l l} \mu_ {k} & \text { if } f \cdot n ^ {- i t} \text { has   order } k \in \mathbb {N} \text { for   some } t \in \mathbb {R}, \\ \mathbb {T} & \text { otherwise }, \end{array} \right.
$$

where the order of $g \in \mathcal { M }$ is the minimum $k \in \mathbb N$ for which $g ^ { k } \equiv 1$ . In particular, we have

$$
1 \in \omega \left(f \left(\frac {n + 1}{n}\right)\right)
$$

for every $f \in \mathcal { M }$ , which is equivalent to (1.1).

In this paper, we extend their dichotomy to those integers $a \in \mathbb { N }$ and $b , d \in \mathbb { Z }$ satisfying $a \mid \operatorname { l c m } ( b , d )$ , thereby strengthening (1.2) as well.<sup>2</sup>

Theorem 1.1. Let $a \geqslant 1$ and $b , d \geqslant 0$ be integers for which $b \neq d$ and $a \mid \operatorname { l c m } ( b , d )$ . Then for every $f \in \mathcal { M }$ , we have

$$
\omega \left(f \left(\frac {a n + b}{a n + d}\right)\right) = \left\{ \begin{array}{l l} \mu_ {k} & \text {if f\cdot n^{-it} has order k\in\mathbb {N} for some t\in\mathbb {R} ,^{3}} \\ \mathbb {T} & \text {otherwise.} \end{array} \right.
$$

Notation. Throughout the paper, we use the standard big O and little o notations, as well as the Vinogradov notation $\ll , \gg$ , where the implied constants depend only on the subscripted parameters. We denote $e ( x ) : = e ^ { 2 \pi i x }$ for $x \in \mathbb { R }$ . Given a non-empty finite subset $S \subseteq \mathbb { N }$ and a function (or distribution) $a : S \to \mathbb { C }$ , we write

$$
\mathbb {E} _ {n \in S} a (n) := \frac {1}{| S |} \sum_ {n \in S} a (n),
$$

and

$$
\mathbb {E} _ {n \in S} ^ {\log} a (n) := \left(\sum_ {n \in S} \frac {1}{n}\right) ^ {- 1} \sum_ {n \in S} \frac {a (n)}{n}.
$$

[[PAGE 3]]
## 2. Pretentious number theory

Pretentious number theory (see [GS14] for an introduction) is instrumental in Tao’s resolution of the Erd˝os discrepancy problem [Tao16b], as well as to the partition regularity of (generalized) Pythagorean pairs established by Frantzikinakis, Klurman, and Moreira [FKM25; FKM24]. We begin by recalling the following definitions.

Definition 2.1 (Pretentious distance). For $f , g \in { \mathcal { M } }$ , and $0 < x < y \leqslant \infty$ , the squared pretentious distance between $f$ and $g$ on $( x , y ]$ is defined as

$$
\mathbb {D} (f, g; x, y) ^ {2} := \sum_ {x <   p \leqslant y} \frac {1 - \operatorname{Re} (f (p) \overline {{g (p)}})}{p} = \frac {1}{2} \sum_ {x <   p \leqslant y} \frac {| f (p) - g (p) | ^ {2}}{p}.
$$

If $\mathbb { D } ( f , g ; 1 , \infty ) < \infty$ , we say that f pretends to be $^ { g , }$ and denote this by $f \sim g . ^ { 4 }$

Definition 2.2 (Positively modified Dirichlet character). Let $\chi$ be a Dirichlet character. Its positively modified Dirichlet character $\widetilde { \chi } : \mathbb { N } \to \mathbb { T }$ is defined on primes by

$$
\widetilde {\chi} (p) = \left\{ \begin{array}{c l} \chi (p) & \text {if} \chi (p) \neq 0, \\ 1 & \text {if} \chi (p) = 0, \end{array} \right.
$$

and extended completely multiplicatively.

Definition 2.3 (Pretentious function). A function $f \in \mathcal { M }$ is pretentious if there exist a primitive Dirichlet character $\chi$ and $t \in \mathbb { R }$ such that $f \sim \widetilde { \chi } \cdot n ^ { i t . 5 }$ Otherwise, it is non-pretentious.<sup>6</sup>

Definition 2.4 (Strongly non-pretentious function). A function $f \in \mathcal { M }$ is strongly nonpretentious if, for every $R \geqslant 1$ , we have

$$
\lim_{N\to \infty}\inf_{\substack{\chi (\text{mod} r),  r\leqslant R\\ |t|\leqslant RN}}\mathbb{D}(f,\widetilde{\chi}\cdot n^{it};1,N) = \infty .
$$

Many non-pretentious functions fail to be strongly non-pretentious. Nevertheless, both non-pretentious functions and their powers admit an upgrade to strong non-pretentiousness along a common subsequence.

Lemma 2.1 (Simultaneous strong non-pretentiousness on a subsequence). Let $\mathcal { E } \subseteq \mathbb { N }$ be a finite non-empty set. Suppose ${ \check { f } } ^ { h }$ is non-pretentious for every $h \in { \mathcal { E } }$ . Then $f o r$ every $R \geqslant 1$ , there exists a strictly increasing sequence of positive integers $( N _ { j } )$ such that

$$
\lim_{j\to \infty}\min_{h\in \mathcal{E}}\inf_{\substack{\chi (\text{mod} r),r\leqslant R\\ |t|\leqslant RN_{j}}}\mathbb{D}(f^{h},\widetilde{\chi}\cdot n^{it};1,N_{j}) = \infty .
$$

Proof. Let $\begin{array} { r } { H : = \prod _ { h \in \mathcal { E } } h } \end{array}$ . If $f ^ { H }$ is pretentious, then $f ^ { h }$ is strongly non-prententious for every $h \in { \mathcal { E } }$ (see [CMT25, Corollary 2.7]). Otherwise, if $f ^ { H }$ is non-pretentious, then there exists $( N _ { j } )$ such that (see [CMT25, Corollary 2.11] for instance)

$$
\lim_{j\to \infty}\inf_{\substack{\psi (\text{mod} r),r\leqslant HR\\ |u|\leqslant (HR)N_{j}}}\mathbb{D}(f^{H},\widetilde{\psi}\cdot n^{iu};1,N_{j}) = \infty .\tag{2.1}
$$

For $h \in \mathcal { E }$ , let $s _ { h } : = \ H / h$ . Then for every $\chi$ (mod r) with $r \ \leqslant \ R$ and $| t | \leqslant R N _ { j }$ , Minkowski’s inequality gives

$$
\mathbb {D} (f ^ {H}, \widetilde {\chi} ^ {s _ {h}} n ^ {s _ {h} i t}; 1, N _ {j}) \leqslant s _ {h} \cdot \mathbb {D} (f ^ {h}, \widetilde {\chi} \cdot n ^ {i t}; 1, N _ {j}),
$$

[[PAGE 4]]
and therefore

$$
\mathbb {D} (f ^ {h}, \widetilde {\chi} \cdot n ^ {i t}; 1, N _ {j}) \geqslant \frac {h}{H} \cdot \mathbb {D} (f ^ {H}, \widetilde {\chi} ^ {s _ {h}} n ^ {s _ {h} i t}; 1, N _ {j}).
$$

Since $| s _ { h } t | \leqslant H ( R N _ { j } )$ and $\mathcal { E }$ is finite, it follows from (2.1) that

$$
\lim_{j\to \infty}\min_{h\in \mathcal{E}}\inf_{\substack{\chi (\text{mod} r),  r\leqslant R\\ |t|\leqslant RN_{j}}}\mathbb{D}(f^{h},\widetilde{\chi}\cdot n^{it};1,N_{j}) = \infty ,
$$

and the proof is complete.

Definition 2.5 (Multiplicative Følner sequence). A sequence $\left( \Phi _ { K } \right)$ of non-empty finite subsets of $\mathbb { Q } _ { > 0 }$ is a multiplicative Følner sequence if for every $r \in \mathbb { Q } _ { > 0 } .$ , we have

$$
\lim _ {K \to \infty} \frac {\left| (r \cdot \Phi_ {K}) \cap \Phi_ {K} \right|}{\left| \Phi_ {K} \right|} = 1.
$$

For instance, one can verify that the sequence $\left( \Phi _ { K } \right)$ defined by

$$
\Phi_ {K} := \left\{\prod_ {p \leqslant K} p ^ {v _ {p}}: K <   v _ {p} \leqslant 2 K \right\} \quad \text {   for   } K \in \mathbb {N}
$$

is a multiplicative Følner sequence (see [FKM25, Proposition 2.5]). Throughout the paper, this is the only multiplicative Følner sequence to be considered.

Using the multiplicative Følner sequence $\left( \Phi _ { K } \right)$ , we obtain an orthogonality relation.

Lemma 2.2 (Multiplicative orthogonality). Let $f \in \mathcal { M }$ . Then

$$
\lim _ {K \to \infty} \mathbb {E} _ {Q \in \Phi_ {K}} f (Q) = \left\{ \begin{array}{l l} 1 & \text {if} f \equiv 1, \\ 0 & \text {otherwise.} \end{array} \right.
$$

Moreover, $f o r$ any prime $p \leqslant K$ with $f ( p ) \neq 1$ , we have

$$
| \mathbb {E} _ {Q \in \Phi_ {K}} f (Q) | \ll \frac {1}{K | 1 - f (p) |}.
$$

Proof. This is essentially [FKM25, Lemma 3.2]. It sufices to assume $f \not \equiv 1$ . By definition, we have

$$
\mathbb {E} _ {Q \in \Phi_ {K}} f (Q) = \prod_ {p \leqslant K} \left(\frac {1}{K} \sum_ {K <   v _ {p} \leqslant 2 K} f (p) ^ {v _ {p}}\right).
$$

If $f ( p ) \neq 1$ , then

$$
\sum_ {K <   v _ {p} \leqslant 2 K} f (p) ^ {v _ {p}} = f (p) ^ {K + 1} \cdot \frac {1 - f (p) ^ {K}}{1 - f (p)},
$$

which implies

$$
|\mathbb{E}_{Q\in \Phi_{K}}f(Q)|\leqslant \prod_{\substack{p\leqslant K\\ f(p)\neq 1}}\frac{2}{K|1 - f(p)|},
$$

and the lemma follows.

For $n \in \mathbb { N } ,$ , by writing $f ( n ) = e ( g ( n ) )$ for some suitable additive function $g : \mathbb { N }  \mathbb { R }$ , the following is a consequence of the Tur´an–Kubilius inequality.

[[PAGE 5]]
Lemma 2.3 (Concentration inequality). Let $f \in \mathcal { M }$ , and $\chi$ be a Dirichlet character of modulus q. Let $K , Q \geqslant 1$ be integers for which

$$
\prod_ {p \leqslant K} p \mid Q \quad \text { and } \quad q \mid Q,
$$

and all prime divisors of Q are at most K. $I f \ N > K$ , then for any positive integer $( a , Q ) = 1$ and $t \in \mathbb { R }$ , we have

$$
\begin{array}{r l} & {\mathbb {E} _ {n \leqslant N} ^ {\log} \left| f (Q n + a) - \chi (a) (Q n) ^ {i t} \exp (- F (\chi , t; K, N)) \right|} \\ & {\quad \ll \mathbb {D} (f, \widetilde {\chi} \cdot n ^ {i t}; K, \infty) + K ^ {- 1 / 2} + o _ {Q, a, t; N \to \infty} (1),} \end{array}
$$

where

$$
F (\chi , t; K, N) := \sum_ {K <   p \leqslant N} \frac {1 - f (p) \overline {{\chi}} (p) p ^ {- i t}}{p}.
$$

Proof. This is a logarithmically weighted version of [Klu+21, Lemma 2.5] (see also [CMT25, Lemma 2.13]). □

For pretentious functions, the concentration inequality shows that their (logarithmic) auto-correlation stabilizes.

Lemma 2.4 (Pretentious logarithmic two-point correlation). Let $f \in \mathcal { M }$ , and $\chi$ be a Dirichlet character of modulus q. Let $K , Q _ { 1 } , Q _ { 2 } \geqslant 1$ be integers for which

$$
\prod_ {p \leqslant K} p \mid \operatorname * {g c d} (Q _ {1}, Q _ {2}), \qquad q \mid \operatorname * {g c d} (Q _ {1}, Q _ {2}),
$$

and all prime divisors of $Q _ { 1 } , Q _ { 2 }$ are at most K. If $N > K$ , then for any positive integers $( a _ { 1 } , Q _ { 1 } ) = 1 , ( a _ { 2 } , Q _ { 2 } ) = 1$ and $t \in \mathbb { R }$ , we have

$$
\begin{array}{c} \mathbb {E} _ {n \leqslant N} ^ {\log} f (Q _ {1} n + a _ {1}) \overline {{f (Q _ {2} n + a _ {2})}} = \chi (a _ {1}) \overline {{\chi (a _ {2})}} (Q _ {1} / Q _ {2}) ^ {i t} \exp (- 2 \mathrm{Re} F (\chi , t; K, N)) \\ + O (\mathbb {D} (f, \widetilde {\chi} \cdot n ^ {i t}; K, \infty) + K ^ {- 1 / 2}) + + o _ {Q _ {1}, Q _ {2}, a _ {1}, a _ {2}, t; N \to \infty} (1). \end{array}
$$

Proof. Using the inequality $\left| z _ { 1 } \overline { { z _ { 2 } } } - w _ { 1 } \overline { { w _ { 2 } } } \right| \leqslant \left| z _ { 1 } - w _ { 1 } \right| + \left| z _ { 2 } - w _ { 2 } \right|$ for $z _ { 1 } , z _ { 2 } , w _ { 1 } , w _ { 2 } \in \mathbb { T }$ , the lemma follows immediately from Lemma 2.3. □

For (strongly) non-pretentious functions, Tao’s estimate shows that their (logarithmic) auto-correlation diminishes.

Lemma 2.5 (Non-pretentious logarithmic two-point correlation). Let $a , b , c , d \in \mathbb { N }$ satisfy

$$
a d - b c \neq 0.
$$

For every $\epsilon > 0$ , there exists $R = R ( \epsilon , a , b , c , d ) \geqslant 1$ such that the following holds. Let $f \in \mathcal { M }$ and $N > R$ . If

$$
\inf_{\substack{\chi \pmod {r},  r\leqslant R\\ |t|\leqslant RN}}\mathbb{D}(f,\widetilde{\chi}\cdot n^{it};1,N)\geqslant R,
$$

then

$$
\left| \mathbb {E} _ {n \leqslant N} ^ {\log} f (a n + b) \overline {{f (c n + d)}} \right| \leqslant \epsilon .
$$

Proof. See [Tao16a, Theorem 1.3].

[[PAGE 6]]
## 3. Preparation

To prove Theorem 1.1, we follow the same underlying strategy as in [CMT25]. However, by starting with the reduction processes introduced in [LT25], it sufices to verify certain special cases, leading to a streamlined argument.

Lemma 3.1 (Arithmetic normalization). Let $a \geqslant 1$ and $b , d \geqslant 0$ be integers satisfying $b \neq d$ and a | lcm $( b , d )$ . Set

$$
g := \operatorname * {g c d} (a, b, d), \quad a ^ {\prime} := a / g, \quad b ^ {\prime} := b / g, \quad d ^ {\prime} := d / g.
$$

Then gcd $( a ^ { \prime } , b ^ { \prime } - d ^ { \prime } ) = 1 \ a n d \ a ^ { \prime } \mid b ^ { \prime } d ^ { \prime }$

Proof. Without loss of generality, assume that $b > d .$ If $a = 1$ or $d = 0$ , then both assertions are immediate. Hence assume that a $\geqslant 2$ and $b , d > 0$

Since lcm $( b , d ) = g \operatorname { l c m } ( b ^ { \prime } , d ^ { \prime } )$ , the assumption $a \mid \operatorname { l c m } ( b , d )$ implies that $a ^ { \prime } \mid \operatorname { l c m } ( b ^ { \prime } , d ^ { \prime } )$ Now let $p$ be any prime divisor of $a ^ { \prime } .$ . Since $a ^ { \prime } \mid b ^ { \prime } d ^ { \prime }$ , we have $p \mid b ^ { \prime } d ^ { \prime }$ . On the other hand, gcd $\begin{array} { r } { [ ( a ^ { \prime } , b ^ { \prime } , d ^ { \prime } ) = 1 } \end{array}$ , so $p$ cannot divide both $b ^ { \prime }$ and $d ^ { \prime } .$ . Thus $p$ divides exactly one of $b ^ { \prime }$ and $d ^ { \prime }$ , and consequently $p \nmid b ^ { \prime } - d ^ { \prime }$ . Since this holds for every prime divisor $p$ of $a ^ { \prime } { . }$ , we conclude that gcd $( a ^ { \prime } , b ^ { \prime } - d ^ { \prime } ) = 1$ □

Lemma 3.2 (Case reduction). Let $a \geqslant 1$ and $b , d \geqslant 0$ be integers. Suppose $b \ >$ $d , \operatorname* { g c d } ( a , b - d ) = 1$ , and $a \mid b d .$ . Then there exist $A , B \in \mathbb { N }$ with $B \geqslant 2$ and $A = B ( B - 1 )$ and $C , D \in \mathbb { N }$ such that, for every integer m $\geqslant 1 , i f n = C m + D$ , then

$$
\frac {a n + b}{a n + d} = \frac {A m + B}{A m + B - 1}.
$$

Proof. See [LT25, Lemma 3.2].

Therefore, it sufices to prove Theorem 1.1 in the above cases, further restricted to a sub-progression chosen so that, after invoking the Erd˝os–Tur´an inequality or Fourier inversion on finite cyclic groups, both Lemma 2.4 and Lemma 2.5 become applicable.

Lemma 3.3 (Restriction to a sub-progression). Let $q \geqslant 1$ and $B \geqslant 2$ be integers. Then there exists $K ( q , B ) \geqslant 1$ such that for every integer $K \geqslant K ( q , B )$ , the following holds:

(a) $\begin{array} { r } { q B ( B - 1 ) \mid \prod _ { v \ll K } p ^ { K } ; } \end{array}$

(b) for every $\begin{array} { r } { Q = \prod _ { p \leqslant K } p ^ { v _ { p } } \in \Phi _ { K } } \end{array}$ , denote

$$
Q^{+}:= \prod_{\substack{p\leqslant K\\ p|B}}p^{v_{p}},\qquad Q^{-}:= \prod_{\substack{p\leqslant K\\ p\nmid B}}p^{v_{p}},
$$

and

$$
L := Q ^ {2}, \qquad R ^ {+} := (B - 1) Q ^ {-} Q, \qquad R ^ {-} := B Q ^ {+} Q.
$$

There exist integers $0 \leqslant \ell < L , 0 \leqslant r ^ { \pm } < R ^ { \pm }$ such that for every integer $n \geqslant 0 .$ we have

$$
(B - 1) (L n + \ell) + 1 = Q ^ {+} (R ^ {+} n + r ^ {+}),
$$

and

$$
B (L n + \ell) + 1 = Q ^ {-} (R ^ {-} n + r ^ {-});
$$

(c) $r ^ { + } \equiv r ^ { - } ~ ( \mathrm { m o d } ~ Q ) ~ a n d \mathrm { g c d } ( r ^ { \pm } , R ^ { \pm } ) = 1$ ;

(d) $R ^ { + } r ^ { - } - R ^ { - } r ^ { + } = - Q \neq 0 .$

[[PAGE 7]]
Proof. Let $Q \in \Phi _ { K }$ and set

$$
S ^ {+} := (B - 1) Q ^ {-}, \qquad S ^ {-} := B Q ^ {+}.
$$

Since every prime $p \leqslant K$ divides exactly one of $S ^ { + }$ and $S ^ { - }$ , we have

$$
(S ^ {+}, S ^ {-}) = 1, \qquad (S ^ {+} - S ^ {-}, Q) = 1.\tag{3.1}
$$

Let $( r _ { 0 } ^ { + } , r _ { 0 } ^ { - } )$ be an integral solution to the B´ezout equation

$$
S ^ {-} r ^ {+} - S ^ {+} r ^ {-} = 1.\tag{3.2}
$$

Then all integral solutions $( r ^ { + } , r ^ { - } )$ are given by

$$
r ^ {+} = S ^ {+} k + r _ {0} ^ {+}, \qquad r ^ {-} = S ^ {-} k + r _ {0} ^ {-} \qquad \mathrm{for} k \in \mathbb {Z}.
$$

In particular, the congruence

$$
r ^ {+} \equiv r ^ {-} (\mathrm{mod} Q)\tag{3.3}
$$

is equivalent to

$$
(S ^ {+} - S ^ {-}) k + (r _ {0} ^ {+} - r _ {0} ^ {-}) \equiv 0 (\mathrm{mod} Q),
$$

which is solvable by (3.1). Replacing k by $k + Q j$ for some integer $j \in \mathbb Z$ preserves this congruence and changes $r ^ { + }$ by $S ^ { + } Q j = ( B - 1 ) Q ^ { - } Q j = R ^ { + } j$ . We may therefore arrange

$$
0 \leqslant r ^ {+} <   R ^ {+},
$$

and

$$
0 \leqslant r ^ {-} = \frac {S ^ {-} r ^ {+} - 1}{S ^ {+}} <   \frac {S ^ {-} R ^ {+}}{S ^ {+}} = R ^ {-}.
$$

Also, by (3.2) and (3.3), we have

$$
\operatorname * {g c d} (r ^ {\pm}, R ^ {\pm}) = 1.
$$

Reducing (3.2) modulo $B - 1$ gives

$$
B Q ^ {+} r ^ {+} \equiv Q ^ {+} r ^ {+} \equiv 1 (\mathrm{mod} B - 1).
$$

Therefore, $Q ^ { + } r ^ { + } - 1$ is divisible by $B - 1$ , and we define

$$
\ell := \frac {Q ^ {+} r ^ {+} - 1}{B - 1}.\tag{3.4}
$$

Since $Q ^ { + } r ^ { + } < Q ^ { + } R ^ { + } = ( B - 1 ) Q ^ { 2 }$ , we have

$$
0 \leqslant \ell <   Q ^ {2} = L.
$$

Using (3.2) and (3.4), we obtain

$$
\ell = \frac {Q ^ {-} r ^ {-} - 1}{B}.\tag{3.5}
$$

Since $Q ^ { + } R ^ { + } = ( B - 1 ) Q ^ { 2 } = ( B - 1 ) L$ , it follows from (3.4) that

$$
(B - 1) (L n + \ell) + 1 = Q ^ {+} (R ^ {+} n + r ^ {+})
$$

for every integer $n \geqslant 0$ . Similarly, since $Q ^ { - } R ^ { - } = B Q ^ { 2 } = B L .$ , it follows from (3.5) that

$$
B (L n + \ell) + 1 = Q ^ {-} (R ^ {-} n + r ^ {-})
$$

for every integer $n \geqslant 0$ . Finally, the expression (3.2) gives

$$
R ^ {+} r ^ {-} - R ^ {-} r ^ {+} = Q (S ^ {+} r ^ {-} - S ^ {-} r ^ {+}) = - Q,
$$

and the lemma follows.

[[PAGE 8]]
## 4. Fourier Flatness

Let $f \in { \mathcal { M } } , B \geqslant 2$ be an integer and $A = B ( B - 1 )$ . Given $K \in \mathbb N$ and $Q \in \Phi _ { K }$ , let $L _ { Q }$ and $\ell _ { Q }$ be furnished by Lemma 3.3, and define

$$
z _ {Q, n} := f \left(\frac {A (L _ {Q} n + \ell_ {Q}) + B}{A (L _ {Q} n + \ell_ {Q}) + (B - 1)}\right) \qquad \text { for } n \in \mathbb {N},
$$

and

$$
\sigma_ {K, N} := \mathbb {E} _ {Q \in \Phi_ {K}} \mathbb {E} _ {n \leqslant N} ^ {\log} \delta_ {z _ {Q, n}} \quad \text { for } N \in \mathbb {N}.
$$

Also, we denote its Fourier coeficients by

$$
\widehat {\sigma} _ {K, N} (h) := \int_ {\mathbb {T}} z ^ {h} d \sigma_ {K, N} (z) = \mathbb {E} _ {Q \in \Phi_ {K}} \mathbb {E} _ {n \leqslant N} ^ {\log} z _ {Q, n} ^ {h} \quad \text {for} h \in \mathbb {Z}.
$$

We show that the first H Fourier coeficients are small unless $f \cdot n ^ { - i t }$ is of order at most H for some $t \in \mathbb { R }$

Proposition 4.1. Let $f \in \mathcal { M }$ and $H \in \mathbb { N } .$ . Suppose $f ^ { h } \not \equiv n ^ { i t }$ for each $1 \leqslant h \leqslant H$ and $t \in \mathbb { R }$ . Then

$$
\lim _ {K \to \infty} \operatorname * {l i m i n f} _ {N \to \infty} \max _ {1 \leqslant h \leqslant H} | \widehat {\sigma} _ {K, N} (h) | = 0.
$$

Proof. Decompose $\{ 1 , \dots , H \} = { \mathcal { H } } \cup { \mathcal { E } }$ , where

$$
\mathcal {H} := \{1 \leqslant h \leqslant H: f ^ {h} \text {is pretentious} \},
$$

and

$$
\mathcal {E} := \{1 \leqslant h \leqslant H: f ^ {h} \text {   is   non - pretentious } \}.
$$

For $h \in \mathcal H$ , there exist a primitive character $\chi _ { h }$ of conductor $q _ { h }$ and $t _ { h } \in \mathbb { R }$ such that $f ^ { h } \sim \widetilde { \chi } _ { h } \cdot n ^ { i t _ { h } }$ . We shall apply Lemma 3.3 with

$$
q = \prod_ {h \in \mathcal {H}} q _ {h}.
$$

Since $A = B ( B - 1 )$ , Lemma 3.3 (b) gives

$$
A (L n + \ell) + B = B Q ^ {+} (R ^ {+} n + r ^ {+})
$$

and

$$
A (L n + \ell) + (B - 1) = (B - 1) Q ^ {-} (R ^ {-} n + r ^ {-})
$$

for every integer $n \geqslant 0$ . Suppressing the subscript $Q { \mathrm { . } }$ , for every $1 \leqslant h \leqslant H$ , we have

$$
z _ {Q, n} ^ {h} = f ^ {h} \left(\frac {B Q ^ {+}}{(B - 1) Q ^ {-}}\right) f ^ {h} (R ^ {+} n + r ^ {+}) \overline {{f ^ {h} (R ^ {-} n + r ^ {-})}}.\tag{4.1}
$$

Let $h \in \mathcal H$ and $f _ { h } : = f ^ { h } { \cdot } n ^ { - i t _ { h } }$ . Then $f _ { h } \sim \widetilde { \chi } _ { h }$ and $\mathbb { D } ( f ^ { h } , \widetilde { \chi } _ { h } . n ^ { i t _ { h } } ; K , \infty ) = \mathbb { D } ( f _ { h } , \widetilde { \chi } _ { h } ; K , \infty )$ for every $K \geqslant K ( q , B )$ . Applying Lemma $3 . 3 \ ( \mathrm { a } )$ and (b), we have

$$
\prod_ {p \leqslant K} p \mid \operatorname * {g c d} (R ^ {+}, R ^ {-}) \quad \text { and } \quad q _ {h} \mid \operatorname * {g c d} (R ^ {+}, R ^ {-}),
$$

and all prime divisors of $R ^ { + } , R ^ { - }$ <sup>−</sup> are at most K. Therefore, Lemma 2.4 is applicable and gives

$$
\begin{array}{l}\mathbb {E} _ {n \leqslant N} ^ {\log} f ^ {h} (R ^ {+} n + r ^ {+}) \overline {{f ^ {h} (R ^ {-} n + r ^ {-})}} = \chi_ {h} (r ^ {+}) \overline {{\chi_ {h} (r ^ {-})}} (R ^ {+} / R ^ {-}) ^ {i t _ {h}} \exp (- 2 \operatorname{Re} F _ {h} (\chi_ {h}; K, N))\\\quad + O (\mathbb {D} (f _ {h}, \widetilde {\chi} _ {h}; K, \infty) + K ^ {- 1 / 2}) + o _ {K, t _ {h}; N \rightarrow \infty} (1)\end{array}\tag {4.2}
$$

[[PAGE 9]]
provided that $N > K$ , where

$$
F _ {h} (\chi_ {h}; K, N) := \sum_ {K <   p \leqslant N} \frac {1 - f _ {h} (p) \overline {{\chi_ {h}}} (p)}{p}.
$$

By Lemma 3.3 (a), (b), and (c) with our choice of $q ,$ we have $\chi _ { h } ( r ^ { + } ) = \chi _ { h } ( r ^ { - } ) \ne 0$ and

$$
\frac {R ^ {+}}{R ^ {-}} = \frac {(B - 1) Q ^ {-}}{B Q ^ {+}}.
$$

Combining with (4.1) and (4.2), we obtain

$$
\begin{array}{r l} & {\mathbb {E} _ {n \leqslant N} ^ {\log} z _ {Q, n} ^ {h} = f _ {h} \left(\frac {B Q ^ {+}}{(B - 1) Q ^ {-}}\right) \exp (- 2 \mathrm{Re} F _ {h} (\chi_ {h}; K, N))} \\ & {\qquad + O (\mathbb {D} (f _ {h}, \widetilde {\chi} _ {h}; K, \infty) + K ^ {- 1 / 2}) + o _ {K, t _ {h}; N \to \infty} (1).} \end{array}\tag{4.3}
$$

Let $g _ { h } \in \mathcal { M }$ be defined on primes by

$$
g _ {h} (p) := \left\{ \begin{array}{l l} f _ {h} (p) & \text { if } p \mid B, \\ \overline {{f _ {h} (p)}} & \text { if } p \nmid B, \end{array} \right.
$$

and extended completely multiplicatively. Then

$$
\begin{array}{r l} & \mathbb {E} _ {Q \in \Phi_ {K}} f _ {h} \left(\frac {B Q ^ {+}}{(B - 1) Q ^ {-}}\right) = f _ {h} \left(\frac {B}{B - 1}\right) \mathbb {E} _ {Q \in \Phi_ {K}} f _ {h} (Q ^ {+}) \overline {{f _ {h} (Q ^ {-})}} \\ & {\qquad = g _ {h} (B (B - 1)) \mathbb {E} _ {Q \in \Phi_ {K}} g _ {h} (Q).} \end{array}\tag{4.4}
$$

Since $g _ { h } \not \equiv 1$ by assumption, there exists a prime p such that $g _ { h } ( p ) \neq 1$ . If $K > p$ , then Lemma 2.2 gives

$$
| \mathbb {E} _ {Q \in \Phi_ {K}} g _ {h} (Q) | \ll \frac {1}{K | 1 - g _ {h} (p) |}.
$$

Combining with (4.3) and (4.4), we obtain

$$
\begin{array}{r l} & {| \mathbb {E} _ {Q \in \Phi_ {K}} \mathbb {E} _ {n \leqslant N} ^ {\log} z _ {Q, n} ^ {h} | \ll \frac {1}{K | 1 - g _ {h} (p) |} \cdot \exp (- 2 \mathrm{Re} F _ {h} (\chi_ {h}; K, N)) + \mathbb {D} (f _ {h}, \widetilde {\chi} _ {h}; K, \infty) + K ^ {- 1 / 2}} \\ & {\quad \quad \quad \ll \frac {1}{K | 1 - f _ {h} (p) |} + \mathbb {D} (f _ {h}, \widetilde {\chi} _ {h}; K, \infty) + K ^ {- 1 / 2} + o _ {K, t _ {h}; N \to \infty} (1).} \end{array}
$$

Since $f _ { h } \sim \widetilde { \chi } _ { h }$ , or equivalently $\mathbb { D } ( f _ { h } , \widetilde { \chi } _ { h } ; 1 , \infty ) < \infty$ , we have

$$
\lim _ {K \to \infty} \mathbb {D} (f _ {h}, \widetilde {\chi} _ {h}; K, \infty) = 0.
$$

Therefore, we conclude that

$$
\lim _ {K \to \infty} \operatorname * {l i m s u p} _ {N \to \infty} \max _ {h \in \mathcal {H}} | \mathbb {E} _ {Q \in \Phi_ {K}} \mathbb {E} _ {n \leqslant N} ^ {\log} z _ {Q, n} ^ {h} | = 0.\tag{4.5}
$$

For $h \in { \mathcal { E } }$ , by Lemma 2.1, there exists a strictly increasing sequence of positive integers $( N _ { j } )$ such that

$$
\min_{h\in \mathcal{E}}\inf_{\substack{\chi (\text{mod} r),  r\leqslant R\\ |t|\leqslant RN_{j}}}\mathbb{D}(f^{h},\widetilde{\chi}\cdot n^{it};1,N_{j})\geqslant R\tag{4.6}
$$

for some suitable $R \geqslant 1$ to be chosen later, provided that $N _ { j } > R$ is suficiently large. Let $K \geqslant K ( q , B )$ and $Q \in \Phi _ { K }$ . Applying Lemma 3.3 (d), we have $R _ { Q } ^ { + } r _ { Q } ^ { - } - R _ { Q } ^ { - } r _ { Q } ^ { + } = - Q \neq 0$ and therefore Lemma 2.5 is applicable. For every $\epsilon > 0$ , choose

$$
R := \max _ {Q \in \Phi_ {K}} R (\epsilon , R _ {Q} ^ {+}, r _ {Q} ^ {+}, R _ {Q} ^ {-}, r _ {Q} ^ {-}).
$$

[[PAGE 10]]
Since (4.6) is satisfied, it follows from Lemma 2.5 that

$$
\max _ {Q \in \Phi_ {K}} \left| \mathbb {E} _ {n \leqslant N _ {j}} ^ {\log} f ^ {h} (R _ {Q} ^ {+} n + r _ {Q} ^ {+}) \overline {{f ^ {h} (R _ {Q} ^ {-} n + r _ {Q} ^ {-})}} \right| \leqslant \epsilon .
$$

Using (4.1), we obtain

$$
\left| \mathbb {E} _ {Q \in \Phi_ {K}} \mathbb {E} _ {n \leqslant N _ {j}} ^ {\log} z _ {Q, n} ^ {h} \right| \leqslant \epsilon .
$$

Since $\epsilon > 0$ can be chosen arbitrarily small, we conclude that

$$
\lim _ {K \to \infty} \operatorname * {l i m i n f} _ {N \to \infty} \max _ {h \in \mathcal {E}} | \mathbb {E} _ {Q \in \Phi_ {K}} \mathbb {E} _ {n \leqslant N _ {j}} ^ {\log} z _ {Q, n} ^ {h} | = 0.\tag{4.7}
$$

Finally, recall that $\widehat { \sigma } _ { K , N } ( h ) = \mathbb { E } _ { Q \in \Phi _ { K } } \mathbb { E } _ { n \leqslant N _ { j } } ^ { \log } z _ { Q , n } ^ { h }$ for $h \in \mathbb { Z }$ . Combining (4.5) and (4.7), we arrive at

$$
\lim _ {K \to \infty} \operatorname * {l i m i n f} _ {N \to \infty} \max _ {1 \leqslant h \leqslant H} | \widehat {\sigma} _ {K, N} (h) | = 0,
$$

and the proof is complete.

## 5. Proof of Theorem 1.1: Infinite order

Applying the Erd˝os–Tur´an inequality, we prove Theorem 1.1 in the case where $f \cdot n ^ { - i t }$ has infinite order for every $t \in \mathbb { R }$

Lemma 5.1 (Erd˝os–Tur´an inequality). Let ν be a probability measure on T, and denote its Fourier coeficients by

$$
\widehat {\nu} (h) := \int_ {\mathbb {T}} z ^ {h} d \nu (z) \quad \text {   for   } h \in \mathbb {Z}.
$$

Also, denote by I the collection of half-open arcs $I \subseteq \mathbb { T }$ . Then for every $H \in \mathbb { N }$ , we have

$$
\sup _ {I \in \mathcal {I}} | \nu (I) - \lambda (I) | \ll \frac {1}{H} + \sum_ {h = 1} ^ {H} \frac {| \widehat {\nu} (h) |}{h},
$$

where λ denotes the normalized Lebesgue (Haar) measure on $\mathbb { T }$

Proof. See [Ruz92, Section 2], and also [KM18, Lemma 2.3].

Applying Lemma 3.1 and then Lemma 3.2, it sufices to verify the special case.

Proposition 5.1. Let $f \in \mathcal { M }$ and A, $B \in \mathbb N$ with $B \geqslant 2$ and $A = B ( B - 1 )$ . Suppose $f \cdot n ^ { - i t }$ has infinite order for every $t \in \mathbb { R }$ . Then

$$
\omega \left(f \left(\frac {A m + B}{A m + (B - 1)}\right)\right) = \mathbb {T}.
$$

Proof. It sufices to show that

$$
\lim _ {K \to \infty} \operatorname * {l i m i n f} _ {N \to \infty} \sup _ {I \in \mathcal {I}} | \sigma_ {K, N} (I) - \lambda (I) | = 0.
$$

Applying Lemma 5.1 with $\nu = \sigma _ { K , N }$ , for every $H \in \mathbb { N }$ , we have

$$
\sup _ {I \in \mathcal {I}} | \sigma_ {K, N} (I) - \lambda (I) | \ll \frac {1}{H} + \sum_ {h = 1} ^ {H} \frac {| \widehat {\sigma} _ {K , N} (h) |}{h}.
$$

Since the assumption $f \cdot n ^ { - i t }$ has infinite order for every $t \in \mathbb { R }$ is equivalent to $f ^ { h } \not \equiv n ^ { i t }$ for every $h \in \mathbb { N }$ and $t \in \mathbb { R }$ , Proposition 4.1 is applicable and gives

$$
\lim _ {K \to \infty} \operatorname * {l i m i n f} _ {N \to \infty} \sup _ {I \in \mathcal {I}} | \sigma_ {K, N} (I) - \lambda (I) | \ll \frac {1}{H}.
$$

Since $H \in \mathbb { N }$ can be chosen arbitrarily large, the proposition follows.

[[PAGE 11]]
## 6. Proof of Theorem 1.1: Finite order

Applying Fourier inversion on finite cyclic groups, we prove Theorem 1.1 in the case where $f \cdot n ^ { - i t }$ has finite order for some $t \in \mathbb { R }$

Lemma 6.1 (Fourier inversion on finite cyclic groups). Given $k \in \mathbb N$ , let ν be a probability measure supported on $\mu _ { k }$ , and denote

$$
\widehat {\nu} (h) := \int_ {\mu_ {k}} z ^ {h} d \nu (z) \qquad f o r h \in \mathbb {Z}.
$$

Then for every $\zeta \in \mu _ { k }$ , we have

$$
\nu (\{\zeta \}) = \frac {1}{k} \sum_ {h = 0} ^ {k - 1} \widehat {\nu} (h) \zeta^ {- h}.
$$

Proof. The lemma follows immediately by integrating the orthogonality relation on $\mu _ { k }$ against $\nu .$ □

Applying Lemma 3.1 and then Lemma 3.2, it sufices to verify the special case.

Proposition 6.1. Let $f \in \mathcal { M }$ and $A , B \in \mathbb { N }$ with $B \geqslant 2$ and $A = B ( B - 1 )$ . Suppose $f \cdot n ^ { - i t }$ has order $k \in \mathbb N$ for some $t \in \mathbb { R }$ . Then

$$
\omega \left(f \left(\frac {A m + B}{A m + (B - 1)}\right)\right) = \mu_ {k}.
$$

Proof. Since

$$
\lim _ {m \to \infty} \left(\frac {A m + B}{A m + (B - 1)}\right) ^ {i t} = 1,
$$

replacing f by $f \cdot n ^ { - i t }$ does not change the set of limit points. We may therefore assume that $f$ has order k. As the case $k = 1$ is clear, we assume $k \geqslant 2$

Since $\sigma _ { K , N }$ is supported on $\mu _ { k }$ , it sufices to show that

$$
\lim _ {K \to \infty} \operatorname * {l i m i n f} _ {N \to \infty} \max _ {\zeta \in \mu_ {k}} \left| \sigma_ {K, N} (\{\zeta \}) - \frac {1}{k} \right| = 0.
$$

Applying Lemma 6.1 with $\nu = \sigma _ { K , N }$ , for every $\zeta \in \mu _ { k }$ , we have

$$
\left| \sigma_ {K, N} (\{\zeta \}) - \frac {1}{k} \right| \leqslant \frac {1}{k} \sum_ {h = 1} ^ {k - 1} | \widehat {\sigma} _ {K, N} (h) |.
$$

Since $f$ has order $k ,$ we have $f ^ { h } \not \equiv n ^ { i t }$ for every $1 \leqslant h \leqslant k - 1$ and $t \in \mathbb { R }$ . Therefore, Proposition 4.1 is applicable, so that

$$
\lim _ {K \to \infty} \operatorname * {l i m i n f} _ {N \to \infty} \max _ {\zeta \in \mu_ {k}} \left| \sigma_ {K, N} (\{\zeta \}) - \frac {1}{k} \right| = 0,
$$

and the proposition follows.

## Acknowledgements

The author would like to thank Oleksiy Klurman and Sacha Mangerel for their friendly support.

[[PAGE 12]]
## References

[CMT25] D. Charamaras, A. Mountakis, and K. Tsinas. On multiplicative recurrence along linear patterns. J. Lond. Math. Soc. (2) 112.3 (2025), Paper No. e70292, 53.

[Don+23] S. Donoso et al. Additive averages of multiplicative correlation sequences and applications. J. Anal. Math. 149.2 (2023), pp. 719–761.

[FKM24] N. Frantzikinakis, O. Klurman, and J. Moreira. Partition regularity of generalized Pythagorean pairs. 2024. arXiv: 2407.08360.

[FKM25] N. Frantzikinakis, O. Klurman, and J. Moreira. Partition regularity ofPythagorean pairs. Forum Math. Pi 13 (2025), Paper No. e5, 52.

[GS14] A. Granville and K. Soundararajan. Multiplicative number theory: The pretentious approach. Book manuscript in preparation. 2014. url: https://dms. umontreal.ca/ andrew/PDF/Book.To2.5.pdf.

[Klu+21] O. Klurman et al. Multiplicative functions that are close to their mean. Trans. Amer. Math. Soc. 374.11 (2021), pp. 7967–7990.

[KM18] O. Klurman and A. P. Mangerel. Rigidity theorems for multiplicative functions. Math. Ann. 372.1-2 (2018), pp. 651–697.

[LT25] S.-K. Leung and C. T´afula. Multiplicative recurrence of M¨obius transformations. 2025. arXiv: 2409.12936.

[Ruz92] I. Z. Ruzsa. On an inequality of Erd˝os and Tur´an concerning uniform distribution modulo one. I. Sets, graphs and numbers (Budapest, 1991). Vol. 60. Colloq. Math. Soc. J´anos Bolyai. North-Holland, Amsterdam, 1992, pp. 621– 630.

[Tao16a] T Tao. The logarithmically averaged Chowla and Elliott conjectures for twopoint correlations. Forum Math. Pi 4 (2016), e8, 36.

[Tao16b] T. Tao. The Erd˝os discrepancy problem. Discrete Anal. (2016), Paper No. 1, 29.

Mathematical Institute<sub>,</sub> University of Oxford<sub>,</sub> Andrew Wiles Building<sub>,</sub> Radcliffe Observatory Quarter Woodstock Rd Oxford OX2 6GG United Kingdom Email address: sunkaileung@gmail.com
