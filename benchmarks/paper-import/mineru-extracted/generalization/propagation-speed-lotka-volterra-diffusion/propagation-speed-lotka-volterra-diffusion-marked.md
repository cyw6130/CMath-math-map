[[PAGE 1]]
# Monotonicity of the propagation speed with respect to the difusion in a Lotka-Volterra competition-difusion system

Cyrille Kenne<sup>∗</sup>

Department of Mathematics, University of British Columbia, Vancouver, BC V6T 1Z2, Canada

August 28, 2026

## Abstract

In this paper, we study the dependence of the propagation speed on the difusion ratio in a Lotkavolterra competition-difusion system under strong competition. The model is known to admits a unique monotone travelling front connecting two exclusion equilibria and the sign of its speed determines which species invades the territory occupied by the other. We establish smoothness results for the wave speed and the wave profile. Our main result shows that the wave speed is a strictly decreasing function of the difusion ratio on explicit unbounded regions of parameter space. This monotonicity had been observed numerically but, had not previously been proved. The proof combines the smooth dependence of both the travelling front and its speed on the difusion ratio, an adjoint identity for the linearized operator and a maximum principle argument. At zero speed, we also prove that there exists a smooth threshold, we obtain an exact formula for its derivative and deduce its monotonicity. These threshold results also provide a complete characterization of the sign of the wave speed.

Mathematics Subject Classification. 35C07, 35K55, 35K57, 92D25, 92D40 Key-words : Lotka-Volterra; travelling wave; monotonicity; competition-difusion model.

## 1. Introduction

In this paper, we consider the following Lotka-Volterra system

$$
\left\{ \begin{array}{r c l l} u _ {t} & = & u _ {x x} + u (1 - u - k _ {1} v), & \text {in} (0, \infty) \times \mathbb {R}, \\ v _ {t} & = & d v _ {x x} + r v (1 - v - k _ {2} u), & \text {in} (0, \infty) \times \mathbb {R}, \end{array} \right.\tag{1.1}
$$

where $k _ { 1 } , k _ { 2 } > 1 , d > 0$ and $r > 0$ . Here, the parameter d is the difusion coeficient of the species v relative to the species u and r is its intrinsic growth rate relative to that of u. The parameters $k _ { 1 }$ and $k _ { 2 }$ represent the interspecific competition coeficients.

[[PAGE 2]]
Spatial dispersal can afect not only the rate at which a population spread but also the outcome of the competition between two species. In the strong competition case $( k _ { 1 } , k _ { 2 } > 1 )$ , it is well known that the system (1.1) has two locally stable exclusion equilibria (1, 0) and (0, 1). The interface separating the territories of species u and v can be then described by a bistable travelling wave. The sign of the wave speed determines which species invades the other, while its absolute value give the rate at which this invasion occurs.

Throughout the paper, we adopt the following notion of monotone travelling wave. A monotone travelling front solution to (1.1) with speed c is a solution of the form,

$$
(u, v) (t, x) = (U, V) (\xi), \qquad \xi = x - c t,
$$

such that

$$
\begin{array}{r c l} {U ^ {\prime \prime} + c U ^ {\prime} + U (1 - U - k _ {1} V)} & = & {0,} \\ {d V ^ {\prime \prime} + c V ^ {\prime} + r V (1 - V - k _ {2} U)} & = & {0,} \end{array}\tag{1.2}
$$

with

$$
(U, V) (- \infty) = (1, 0), \qquad (U, V) (+ \infty) = (0, 1)\tag{1.3}
$$

and

$$
U ^ {\prime} <   0 <   V ^ {\prime} \text { in } \mathbb {R}.\tag{1.4}
$$

Here, $c < 0$ means that the species v invades species u and $c > 0$ means that the species u invades the species v.

The classical theory of travelling waves for bistable competition-difusion systems has been developed in [7, 8, 14, 15]. In particular, it well known that for every $k _ { 1 } , k _ { 2 } > 1$ and $r , d > 0$ , there exists a unique real number $c : = c _ { k _ { 1 } , k _ { 2 } , r , d }$ for which (1.2)-(1.4) admits a solution $( U , V ) : = ( U _ { k _ { 1 } , k _ { 2 } , r , d } , V _ { k _ { 1 } , k _ { 2 } , r , d } )$ . This solution belongs to $C ^ { \infty } ( \mathbb { R } ) ^ { 2 }$ , is unique up to a translation and satisfies $0 < U ( \xi ) , V ( \xi ) < 1$ for every $\xi \in \mathbb { R }$ . It is also known that if we normalize the front by assuming that $\begin{array} { r } { U ( 0 ) = \frac { 1 } { 2 } } \end{array}$ , then the front is unique [10]. In this paper, we will consider such normalized front.

Determining the sign of the wave speed has been extensively studied in [1, 5, 6, 10, 12, 18, 20, 24, 25, 23, 27] and the references therein. A recent work [21] substantially enlarged the regions of parameters in which previously results were known. We also refer to [9] for an excellent survey on the topic. For related results on spreading speeds in Lotka-Volterra systems, see [4, 22].

We mention that when completing this manuscript, a preprint [19] appeared. Its authors obtained the continuity of the zero speed threshold, its strict monotonicity, endpoint values and the complete propagation direction for the system (1.1). Thus, these results overlap with the characterization of the zero speed threshold presented here. In addition, we establish the smoothness of the threshold and derive an explicit formula for its derivative (see (1.11)). Thereby providing additional information on the threshold mentioned in [19, Remark 5.6].

In our previous work [17], we proved that when $r = 1$ and $k _ { 1 } = k _ { 2 } : = k > 1$ 2

$$
\mathrm{sign} c _ {k, k, 1, d} = \mathrm{sign} (1 - d),
$$

thereby establishing the “Unity is not strength” theorem (see e.g., [9, 11]): under equal intrinsic growth rates and strong competition, the faster difuser prevails. As a first observation, we can adapt the scaling argument of [12], to obtain the following result for every $r > 0$ and for $k _ { 1 } = k _ { 2 } : = k > 1$ ，

[[PAGE 3]]
$$
\operatorname{sign} c _ {k, k, r, d} = \operatorname{sign} (r - d).
$$

Consequently, species v invades species u when $d > r ,$ species u invades species v when $d < r$ and the front is standing when $d = r$ . This means that, the direction of propagation is determined by the ratio ${ \frac { d } { r } } .$ This determines the direction of propagation, but not how the signed speed varies with the difusion ratio $d .$

Kan-On [14] established monotone dependence of the propagation speed with respect to the reactions parameters. They obtained that the speed is strictly decreasing in $k _ { 1 }$ and strictly increasing in $k _ { 2 }$ The main idea was to diferentiate the travelling-wave system with respect to the parameters under consideration and to test the resulting linearized equation against a bounded solution of the adjoint problem. They thus obtained an integral representation for the derivative of the wave speed and used the monotonicity properties of the wave profile as well as sign properties of the adjoint egeinfunction to determine the sign of this derivative. However, their results do not cover the monotonicity with respect to the difusion ratio d.

In [3], Alzahrani et al. studied how relative motility and competition strength interact to determine the direction of bistable travelling wave in Lotka-Volterra competition systems. They identified regions in which the motility rate can slow, halt or reverse the invasion. Their numerical simulations suggested that the wave speed is increasing with respect to the relative motility. Based on that, they conjectured that the wave speed is an increasing function of the relative motility. We mention that their convention is opposite to ours and so, in our setting, their conjecture means the wave speed is decreasing with respect to d. Girardin [9] also observed a form of monotonicity of the speed with respect to d in numerical computations. We also mention [13]. Risler [23], developed a first-order variation for the speed under small perturbations of the difusion coeficient. Despite the numerical observations, no previous result ha established the strict monotonicity of the bistable wave speed on the difusion ratio in the Lotka-Volterra competition system [9, 10, 21].

One of the main purposes of this paper is to study the monotonicity of the wave speed. We prove that the wave speed is strictly decreasing with respect to the difusion ratio d on explicit unbounded parameters ranges. Our main result is the following.

Theorem 1.1. Let $k _ { 1 } , k _ { 2 } > 1$ and $r , d > 0$ . Suppose that

$$
c _ {k _ {1}, k _ {2}, r, d} \leq 0 \text { and } c _ {k _ {1}, k _ {2}, r, d} \left(1 - \frac {1}{d}\right) \leq 0.\tag{1.5}
$$

Then

$$
\partial_ {d} c _ {k _ {1}, k _ {2}, r, d} <   0.\tag{1.6}
$$

In particular, (1.6) holds true at every standing front.

In the symmetric case, we can obtain the exact parameters regions in which the speed is monotone with respect to the difusion ratio $d .$

[[PAGE 4]]
Corollary 1.2. Let $k _ { 1 } = k _ { 2 } : = k > 1$ and $r , d > 0$ . Suppose that either (i) $d > r$ and $d \geq 1$ or (ii) $d = r$ holds. Then

$$
\partial_ {d} c _ {k, k, r, d} <   0.\tag{1.7}
$$

This means that when $r \geq 1$ , the function d $\mapsto c _ { k , k , r , d }$ is strictly decreasing on $\lbrack r , \infty )$ and when $0 < r < 1$ 2 the function $d \mapsto c _ { k , k , r , d }$ is strictly decreasing on $[ 1 , \infty )$ and in addition,

$$
\partial_ {d} c _ {k, k, r, d} | _ {d = r} <   0.
$$

The proof of Theorem 1.1 combines the diferentiability of the travelling wave with respect to d and an adjoint identity for the linearized operator as in [14]. The main dificulty is that the diferentiation of the second equation in (1.2) with respect to d gives a term involving $V ^ { \prime \prime }$ whose sign is not fixed. We exploit the properties of the system as well as those of the adjoint system and a maximum principle argument. To our knowledge, this is the first analytic proof of strict monotonicity with respect to d on an unbounded interval. The global monotonicity remains open.

We also provide a characterization of the zero speed set. The existence, continuity, strict monotonicity and endpoint values stated below are also in [19, Theorem 1.3]. Our proofs are independent of the proofs of [19]. In addition, we obtain the $C ^ { \infty }$ regularity and the exact formula (1.11).

Theorem 1.3. Let $k _ { 2 } > 1$ . There exists a unique function $\kappa ( \cdot ; k _ { 2 } )$ such that

$$
c _ {k _ {1}, k _ {2}, r, d} = 0 \Longleftrightarrow k _ {1} = \mathcal {K} \left(\frac {d}{r}; k _ {2}\right).\tag{1.8}
$$

It is of class $C ^ { \infty }$ , strictly decreasing on $( 0 , \infty )$ and satisfies:

$$
\sqrt {k _ {2}} <   \mathcal {K} (\delta ; k _ {2}) <   k _ {2} ^ {2} \quad f o r e v e r y \delta > 0, \qquad \mathcal {K} (1; k _ {2}) = k _ {2},\tag{1.9}
$$

$$
\lim _ {\delta \downarrow 0} \mathcal {K} (\delta ; k _ {2}) = k _ {2} ^ {2}, \quad \lim _ {\delta \rightarrow + \infty} \mathcal {K} (\delta ; k _ {2}) = \sqrt {k _ {2}}.\tag{1.10}
$$

More precisely, let $( U , V )$ be the standing monotone front at $( k _ { 1 } , k _ { 2 } , r , d ) = ( \mathcal { K } ( \delta ; k _ { 2 } ) , k _ { 2 } , 1 , \delta )$ . We set $p = - U ^ { \prime } > 0 , q = V ^ { \prime } > 0$ and we consider $\Psi = ( - a , b ) ^ { T }$ with $a , b > 0$ as given in Proposition 2.2. Then

$$
\partial_ {\delta} \mathcal {K} (\delta ; k _ {2}) = - \frac {\int_ {\mathbb {R}} W d \xi}{2 \delta \int_ {\mathbb {R}} a U V d \xi} <   0,\tag{1.11}
$$

where $W : = a ^ { \prime } p - a p ^ { \prime } = \delta ( b q ^ { \prime } - b ^ { \prime } q ) > 0$ . The function $\kappa ( \cdot ; k _ { 2 } )$ is therefore a decreasing bijection from $( 0 , \infty )$ onto $\left( \sqrt { k _ { 2 } } , k _ { 2 } ^ { 2 } \right)$

We mention that the bounds in (1.9) hold at every standing front. We also obtain the following complete sign characterization, which is also contained in [19, Corollary 1.4].

Theorem 1.4. Let $k _ { 1 } , k _ { 2 } > 1$ and $d , r > 0$ . We set $\begin{array} { r } { \delta = \frac { d } { r } } \end{array}$

[[PAGE 5]]
(i) If $k _ { 1 } \leq \sqrt { k _ { 2 } }$ then $c _ { k _ { 1 } , k _ { 2 } , r , d } > 0$ , and if $k _ { 1 } \geq k _ { 2 } ^ { 2 }$ then $c _ { k _ { 1 } , k _ { 2 } , r , d } < 0$ , for every $d , r > 0$

(ii) $I f \sqrt { k _ { 2 } } < k _ { 1 } < k _ { 2 } ^ { 2 }$ , then there exists a unique $\delta ^ { * } = \delta ^ { * } ( k _ { 1 } , k _ { 2 } ) > 0$ such that

$$
c _ {k _ {1}, k _ {2}, r, d} \left\{ \begin{array}{l l} > 0, & 0 <   \delta <   \delta^ {*}, \\ = 0, & \delta = \delta^ {*}, \\ <   0, & \delta > \delta^ {*}, \end{array} \right.\tag{1.12}
$$

and moreover

$$
\mathrm{sign} (\delta^ {*} - 1) = \mathrm{sign} (k _ {2} - k _ {1}).\tag{1.13}
$$

Combining Theorems 1.1 and 1.4, we obtain the following result.

Corollary 1.5. Let $k _ { 1 } , k _ { 2 } > 1$ and $r > 0$

(i) $I f k _ { 1 } \ge k _ { 2 } ^ { 2 }$ , then the function $d \mapsto c _ { k _ { 1 } , k _ { 2 } , r , d }$ is strictly decreasing on $\lbrack 1 , \infty )$

(ii) Assume that $\sqrt { k _ { 2 } } < k _ { 1 } < k _ { 2 } ^ { 2 }$ and let $d ^ { * } : = r \delta ^ { * } ( k _ { 1 } , k _ { 2 } )$ . If $d ^ { * } \geq 1$ , then the function $d \mapsto c _ { k _ { 1 } , k _ { 2 } , r , d }$ is strictly decreasing on $[ d ^ { * } , \infty )$ $H d ^ { * } < 1$ , then it is strictly decreasing on $\lbrack 1 , \infty )$ and

$$
\partial_ {d} c _ {k _ {1}, k _ {2}, r, d} | _ {d = d ^ {*}} <   0.
$$

The rest of the paper is organized as follows. In Section 2, we study the properties of the linearized operator associated to the system (1.2)-(1.3) and recall the standing front identities that we use in the sequel. We prove our main results in Section 3.

## Notations

Throughout the paper, we use the standard Sobolev space notations. We write $L ^ { 2 } ( \mathbb { R } ) ^ { 2 } : = L ^ { 2 } ( \mathbb { R } ; \mathbb { R } ^ { 2 } )$ and $H ^ { 2 } ( \mathbb { R } ) ^ { \bar { 2 } } : = H ^ { 2 } ( \mathbb { R } ; \bar { \mathbb { R } ^ { 2 } } )$ . We denote by $C _ { b } ( \mathbb { R } ) ^ { 2 } : = C _ { b } ( \mathbb { R } ; \mathbb { R } ^ { 2 } )$ the space of bounded continuous functions from R to $\mathbb { R } ^ { 2 }$ , and by $\mathrm { B U C } : = \mathrm { B U C } ( \mathbb { R } ; \mathbb { R } ^ { 2 } )$ the space of bounded uniformly continuous functions from R to $\mathbb { R } ^ { 2 }$ For $z \in \mathbb { R } ^ { 2 }$ , ∥z∥ denotes the Euclidean norm in $\mathbb { R } ^ { 2 }$ . For $f , g \in L ^ { 2 } ( \mathbb { R } ) ^ { 2 }$ , we denote their $L ^ { 2 } .$ -inner product by $\langle f , g \rangle _ { L ^ { 2 } }$ . For a linear operator T, we write ker T and Ran T for its kernel and range, respectively and span $\{ h \}$ for the linear space generated by h. DF(Φ) denotes the Jacobian matrix of F evaluated at Φ. The symbol <sup>′</sup> will be used for the derivative with respect to the variable ξ and $\partial _ { a }$ for the partial derivative with respect to the parameter a. Finally, we set $\pi : = ( k _ { 1 } , k _ { 2 } , r , d ) \in Q : = ( 1 , \infty ) ^ { 2 } \times ( 0 , \infty ) ^ { 2 }$

## 2. Properties of the front, linearization and the sign of the wave speed

We recall in this section some known results (see $\mathrm { e . g . , \ [ 1 4 , 1 5 , 2 3 ] ) }$ and we study the properties of the linearized operator associated to the system (1.2)-(1.3). We write (1.2)-(1.3) on a compact form as follows. Let $\Phi : = ( U , V ) ^ { T }$ , then (1.2)-(1.3) becomes

$$
\mathbf {D} _ {d} \Phi^ {\prime \prime} + c \Phi^ {\prime} + \mathbf {F} _ {k _ {1}, k _ {2}, r} (\Phi) = 0, \qquad \Phi (- \infty) = E _ {-} := \binom{1}{0}, \quad \Phi (+ \infty) = E _ {+} := \binom{0}{1},\tag{2.1}
$$

[[PAGE 6]]
where

$$
\mathbf {D} _ {d} = \left( \begin{array}{c c} 1 & 0 \\ 0 & d \end{array} \right) \qquad \text { and } \qquad \mathbf {F} _ {k _ {1}, k _ {2}, r} (\Phi) = \binom{U (1 - U - k _ {1} V)}{r V (1 - V - k _ {2} U)}.\tag{2.2}
$$

We also introduce the linearized operator of (2.1) at Φ defined by

$$
\mathcal {L}: H ^ {2} (\mathbb {R}) ^ {2} \to L ^ {2} (\mathbb {R}) ^ {2}, \qquad \mathcal {L} (h) := \mathbf {D} _ {d} h ^ {\prime \prime} + c h ^ {\prime} + D \mathbf {F} _ {k _ {1}, k _ {2}, r} (\Phi (\cdot)) h.\tag{2.3}
$$

Note that for $\Phi = ( U , V ) ^ { T }$ such that $0 < U , V < 1$ , L is a well defined. The adjoint of the $L ^ { 2 } .$ -unbounded realization of L is defined as

$$
\mathcal {L} ^ {*}: H ^ {2} (\mathbb {R}) ^ {2} \to L ^ {2} (\mathbb {R}) ^ {2}, \qquad \mathcal {L} ^ {*} (h) := \mathbf {D} _ {d} h ^ {\prime \prime} - c h ^ {\prime} + D \mathbf {F} _ {k _ {1}, k _ {2}, r} (\Phi (\cdot)) ^ {T} h.\tag{2.4}
$$

We observe that a diferentiation of (2.1) gives $\begin{array} { r } { \mathcal { L } ( \Phi ^ { \prime } ) = 0 } \end{array}$

The proof of the following result follow closely the arguments contained in [17, Lemma 2.2]. We omit it for brevity.

Lemma 2.1. Let $\pi _ { 0 } = ( k _ { 1 , 0 } , k _ { 2 , 0 } , r _ { 0 } , d _ { 0 } ) \in Q$ and let $( \Phi _ { 0 } , c _ { 0 } )$ be its monotone front. There exist $C , \eta > 0$ such that

$$
\| \Phi_ {0} (\xi) - E _ {-} \| + \| \Phi_ {0} ^ {\prime} (\xi) \| \leq C e ^ {\eta \xi}, \qquad \xi \leq 0\tag{2.5}
$$

and

$$
\| \Phi_ {0} (\xi) - E _ {+} \| + \| \Phi_ {0} ^ {\prime} (\xi) \| \leq C e ^ {- \eta \xi}, \qquad \xi \geq 0.\tag{2.6}
$$

In particular,

$$
\Phi_ {0} ^ {\prime} \in H ^ {2} (\mathbb {R}) ^ {2}, \qquad \Phi_ {0} ^ {\prime \prime} \in L ^ {2} (\mathbb {R}) ^ {2}, \qquad \mathbf {F} _ {k _ {1, 0}, k _ {2, 0}, r _ {0}} (\Phi_ {0}) \in L ^ {2} (\mathbb {R}) ^ {2}.\tag{2.7}
$$

Moreover, for every integer $m \geq 1$ , there exists $C _ { m } > 0$ such that

$$
\| \Phi_ {0} ^ {(m)} (\xi) \| \leq C _ {m} e ^ {- \eta | \xi |}, \quad \text {   for   all   } \xi \in \mathbb {R}.\tag{2.8}
$$

We have the following result.

Proposition 2.2. Let $k _ { 1 } , k _ { 2 } > 1$ and $r , d > 0$ . Then the operator $\mathcal { L }$ is Fredholm of index 0. Moreover,

$$
\ker \mathcal {L} = \operatorname{span} \left\{\Phi^ {\prime} \right\}, \quad \text { codim   Ran } \mathcal {L} = 1\tag{2.9}
$$

and there exists $\Psi : = ( - a , b ) ^ { T } \in H ^ { 2 } ( \mathbb { R } ) ^ { 2 }$ with $a , b > 0$ and $( a , b ) ( \pm \infty ) = 0$ such that

$$
\ker \mathcal {L} ^ {*} = \operatorname{span} \left\{\Psi \right\}.\tag{2.10}
$$

Proof. The Fredholm property is sketched in [17], so we omit it here. The first equality in (2.9) is contained in [15, Lemma 3.3] for the case of the operator $\mathcal { L }$ defined on the space X = BUC. Here, the operator $\mathcal { L } : \dot { H } ^ { 2 } ( \mathbb { R } ) ^ { 2 } \to L ^ { 2 } ( \mathbb { R } ) ^ { 2 }$ and we can adapt their results (see also [23]). However, we will provide a complete proof for clarity and for further needs. Let $h = ( h _ { 1 } , h _ { 2 } ) ^ { T } \in H ^ { \bar { 2 } } ( \bar { \mathbb { R } } ) ^ { 2 }$ . Then $\mathcal { L } h = 0$ is equivalent

[[PAGE 7]]
to

$$
\left\{ \begin{array}{l} h _ {1} ^ {\prime \prime} + c h _ {1} ^ {\prime} + (1 - 2 U - k _ {1} V) h _ {1} - k _ {1} U h _ {2} = 0, \\ d h _ {2} ^ {\prime \prime} + c h _ {2} ^ {\prime} + r (1 - 2 V - k _ {2} U) h _ {2} - r k _ {2} V h _ {1} = 0. \end{array} \right.\tag{2.11}
$$

We transform the system (2.11) to a cooperative system by letting $w _ { 1 } = - h _ { 1 }$ and $w _ { 2 } = h _ { 2 }$ . We thus obtain

$$
\left\{ \begin{array}{l} w _ {1} ^ {\prime \prime} + c w _ {1} ^ {\prime} + (1 - 2 U - k _ {1} V) w _ {1} + k _ {1} U w _ {2} = 0, \\ d w _ {2} ^ {\prime \prime} + c w _ {2} ^ {\prime} + r (1 - 2 V - k _ {2} U) w _ {2} + r k _ {2} V w _ {1} = 0. \end{array} \right.\tag{2.12}
$$

Note that because $\begin{array} { r } { \mathcal { L } ( \Phi ^ { \prime } ) = 0 } \end{array}$ , we have from (1.4) that $w = ( - U ^ { \prime } , V ^ { \prime } ) ^ { T }$ is a positive solution to (2.12). In addition, we obtain from Lemma 2.1 that $\operatorname* { l i m } _ { \xi  \pm \infty } w ( \xi ) = 0$ . Next, we can write the system (2.12) on the form

$$
\tilde {\mathcal {L}} w := \mathbf {D} _ {d} w ^ {\prime \prime} + \mathbf {C} w ^ {\prime} + \mathbf {B} (\xi) w = 0.\tag{2.13}
$$

where $\mathbf { D } _ { d }$ is defined in (2.2), $\mathbf { C } = { \binom { c } { 0 } } \mathbf { \binom { 0 } { c } }$ and $\mathbf { B } ( \xi ) = \left( \begin{array} { c c } { 1 - 2 U ( \xi ) - k _ { 1 } V ( \xi ) } & { k _ { 1 } U ( \xi ) } \\ { r k _ { 2 } V ( \xi ) } & { r ( 1 - 2 V ( \xi ) - k _ { 2 } U ( \xi ) ) } \end{array} \right)$ Then the limiting matrices $\mathbf { B } _ { \pm } : = \operatorname* { l i m } _ { \xi  \pm \infty } \mathbf { B } ( \xi )$ have each two negative eigenvalues, so they have negative principal eigenvalues. Finally, $\mathbf { B } ( \boldsymbol { \xi } )$ is irreductible in the functional sense because $k _ { 1 } U ( \xi ) > 0$ and $r k _ { 2 } V ( \xi ) > 0$ . We apply [26, Chapter 4, Theorem 5.1] to deduce that ker $\tilde { \mathcal { L } } = \operatorname { s p a n } \{ w \}$ . Therefore, ker ${ \mathcal { L } } =$ span $\{ \Phi ^ { \prime } \}$ . Moreover, the adjoint equation $\tilde { \mathcal { L } } ^ { \ast } \tilde { w } = 0$ , with $\tilde { w } ( \pm \infty ) = 0$ has a unique positive solution up to a constant factor. Hence, there exists $a , b > 0$ with $( a , b ) ( \pm \infty ) = 0$ , such that ker $\tilde { \mathcal { L } } ^ { * } = \operatorname { s p a n } \left\{ \left( \begin{array} { l } { a } \\ { b } \end{array} \right) \right\}$

This implies that ker $\mathcal { L } ^ { * } = \operatorname { s p a n } \left\{ \left( \begin{array} { l } { - a } \\ { b } \end{array} \right) \right\}$ . The exponential dichotomies of the limiting adjoint systems gives exponential decay of this solution and of its first derivative. Using the adjoint diferential equation, we can deduce the exponential decay of its second derivative. Hence, $( a , b ) \in H ^ { 2 } ( \mathbb { R } ) ^ { 2 }$ □

Remark 2.3. The following observations are in order. We note that since $\mathcal { L }$ is Fredholm, Ran L is closed. Then we can write the orthogonal decomposition $L ^ { 2 } ( \mathbb { R } ) ^ { 2 } = \operatorname { R a n } \mathcal { L } \oplus ( \operatorname { R a n } \mathcal { L } ) ^ { \perp }$ . Next, as ker ${ \mathcal { L } } ^ { * } =$ $( \mathrm { R a n } \mathcal { L } ) ^ { \perp }$ , we can deduce from (2.10) that

$$
\operatorname{Ran} \mathcal {L} = \left\{f \in L ^ {2} (\mathbb {R}) ^ {2}: \langle f, \Psi \rangle_ {L ^ {2}} = 0 \right\}, \quad \Psi = (- a, b) ^ {T}, \quad a, b > 0.\tag{2.14}
$$

Moreover,

$$
\langle \Psi , \Phi^ {\prime} \rangle_ {L ^ {2}} = \int_ {\mathbb {R}} (- a (\xi) U ^ {\prime} (\xi) + b (\xi) V ^ {\prime} (\xi)) d \xi > 0.\tag{2.15}
$$

This implies that $\Phi ^ { \prime } \notin $ Ran $\mathcal { L } .$

We also mention that a similar result for the adjoint operator is obtained in [16, Lemma A. 2.] when the speed $c = 0$ . We believe that one could also adapt their proof for $c \neq 0$

Next, we state the following smoothness result.

Theorem 2.4. Let $\pi \in Q$ and let $c _ { \pi }$ be the speed of the unique monotone front $\Phi _ { \pi } = ( U _ { \pi } , V _ { \pi } ) ^ { T }$ of

[[PAGE 8]]
(1.2)-(1.3) associated with π and normalized by $\begin{array} { r } { U _ { \pi } ( 0 ) = \frac { 1 } { 2 } } \end{array}$ . Then the speed map

$$
\pi \longmapsto c _ {\pi}
$$

is of class $C ^ { \infty }$ on $Q .$ . Moreover, for every $\pi _ { 0 } \in Q$ , the map

$$
\pi \longmapsto \Phi_ {\pi} - \Phi_ {\pi_ {0}} \in H ^ {2} (\mathbb {R}) ^ {2}
$$

is of class $C ^ { \infty }$ on $Q .$

Proof. The proof of the local diferentiability follows the same arguments as in [17, Theorem 3.2]. We only upgrade from the local diferentiability to the global one. For every fixed $\pi _ { 0 } \in Q$ , there exists a neighbourhood $\mathcal { V } _ { 0 }$ of $\pi _ { 0 } \in Q$ such that the map

$$
\pi \longmapsto \Phi_ {\pi} - \Phi_ {\pi_ {0}} \in H ^ {2} (\mathbb {R}) ^ {2}
$$

is of class $C ^ { \infty }$ on $\mathcal { V } _ { 0 }$ . Now let $\pi _ { 1 } \in Q$ be arbitrary. Then there exists a neighbourhood $\nu _ { 1 }$ of $\pi _ { 1 }$ such that the map

$$
\pi \mapsto \Phi_ {\pi} - \Phi_ {\pi_ {1}} \in H ^ {2} (\mathbb {R}) ^ {2}
$$

is of class $C ^ { \infty }$ on $\mathcal { V } _ { 1 }$ . Let $\pi \in \mathcal { V } _ { 1 }$ . We write

$$
\Phi_ {\pi} - \Phi_ {\pi_ {0}} = (\Phi_ {\pi} - \Phi_ {\pi_ {1}}) + (\Phi_ {\pi_ {1}} - \Phi_ {\pi_ {0}}).\tag{2.16}
$$

The first term of (2.16) belongs to $H ^ { 2 } ( \mathbb { R } ) ^ { 2 }$ . We can deduce from Lemma 2.1 that the second term belongs also to $H ^ { 2 } ( \mathbb { R } ) ^ { 2 }$ . Since $\pi _ { 1 } \in Q$ was arbitrary, we conclude that the map $\pi \mapsto \Phi _ { \pi } - \Phi _ { \pi _ { 0 } }$ is of class $C ^ { \infty }$ from $Q$ into $H ^ { 2 } ( \mathbb { R } ) ^ { 2 }$ . This completes the proof. □

We now state the following result determining the sign of the wave speed in the symmetric case. This result is obtained from the particular case $r = 1$ in [17, Theorem 1.1] by using a scaling argument (see e.g., [12]).

Lemma 2.5. Let $k _ { 1 } = k _ { 2 } : = k > 1$ and $r , d > 0$ . Then

$$
\mathrm{sign} c _ {k, k, r, d} = \mathrm{sign} (r - d).\tag{2.17}
$$

That is

$$
c _ {k, k, r, d} \left\{ \begin{array}{l l} > 0, & 0 <   d <   r, \\ = 0, & d = r, \\ <   0, & d > r. \end{array} \right.\tag{2.18}
$$

Proof. First, it is worth mentioning that the orientation of profiles in [12] are opposite to ours, so they speed $s = - c .$ Next from [12, Theorem 1.3], we have that for any $l > 0$ , sign $s ( a , k , k , d ) \ =$ sign $s ( l a , k , k , l d )$ . In our setting, this means sign $c _ { k , k , r , d } = \mathrm { s i g n } c _ { k , k , l r , l d }$ for any $l > 0$ . In particular for $\textstyle l = { \frac { 1 } { r } }$ , we have sign $c _ { k , k , r , d } = \mathrm { s i g n } c _ { k , k , 1 , \frac { d } { r } }$ . From [17, Theorem 1.1], sign $c _ { k , k , 1 , \delta } = \mathrm { s i g n } ( 1 - \delta )$ for all $\delta > 0$

[[PAGE 9]]
Hence, by choosing $\begin{array} { r } { \delta = \frac { d } { r } > 0 } \end{array}$ , we obtain

$$
\operatorname{sign} c _ {k, k, r, d} = \operatorname{sign} c _ {k, k, 1, \frac {d}{r}} = \operatorname{sign} \left(1 - \frac {d}{r}\right) = \operatorname{sign} (r - d),
$$

because $r > 0$

Remark 2.6. The following observations are in order. Here, $c _ { k , k , r , d } < 0$ means that the territory occupied by the species v expands to the left, while $c _ { k , k , r , d } > 0$ means that the species u advances to the right. Since $\begin{array} { r } { d = \frac { d _ { 2 } } { d _ { 1 } } } \end{array}$ and $\begin{array} { r } { r = \frac { r _ { 2 } } { r _ { 1 } } } \end{array}$ , we can rewrite (2.18) as

$$
c _ {k, k, r, d} \left\{ \begin{array}{l l} > 0, & 0 <   \frac {d _ {2}}{r _ {2}} <   \frac {d _ {1}}{r _ {1}}, \\ = 0, & \frac {d _ {2}}{r _ {2}} = \frac {d _ {1}}{r _ {1}}, \\ <   0, & \frac {d _ {2}}{r _ {2}} > \frac {d _ {1}}{r _ {1}}. \end{array} \right.\tag{2.19}
$$

When $r _ { 1 } ~ = ~ r _ { 2 }$ , we obtain the “Unity is not strength” result (see $_ { \mathrm { e . g . , ~ } \left[ 9 , \ 1 1 \right] ) }$ : In a homogeneous environment under strong competition, the faster difuser advances. However, when the species have diferent growth rates, the outcome may change. For example we can have $d _ { 2 } > d _ { 1 }$ but the species v recedes. This happens when its intrinsic growth rate is suficiently larger compared to the one of the species u. Conversely, the species v may advances if $d _ { 2 } < d _ { 1 }$ if its intrinsic growth rate is suficiently smaller compared to the one of the species u.

Next, for standing fronts, we use the normalization $( r , d ) = ( 1 , \delta )$ where $\begin{array} { r } { \delta = { \frac { d } { r } } } \end{array}$ . The profile equations $( 1 . 2 ) ‐ ( 1 . 3 )$ with $c = 0$ become

$$
U ^ {\prime \prime} + U (1 - U - k _ {1} V) = 0, \quad \delta V ^ {\prime \prime} + V (1 - V - k _ {2} U) = 0.\tag{2.20}
$$

Lemma 2.7. let $k _ { 1 } , k _ { 2 } > 1$ and let (U, V ) be a monotone standing front. We set $W : = 1 - U - V$ . Then $W > 0$ in R and

$$
0 <   - U ^ {\prime} (\xi) \leq \sqrt {k _ {1} - 1}   U (\xi), \qquad 0 <   V ^ {\prime} (\xi) \leq \sqrt {\frac {k _ {2} - 1}{\delta}}   V (\xi), \qquad \xi \in \mathbb {R}.\tag{2.21}
$$

$$
| U ^ {\prime \prime} (\xi) | \leq k _ {1} U (\xi), \qquad | V ^ {\prime \prime} (\xi) | \leq \frac {k _ {2}}{\delta} V (\xi), \qquad f o r a l l \xi \in \mathbb {R},\tag{2.22}
$$

and

$$
\lim _ {\xi \to + \infty} \frac {(U ^ {\prime} (\xi)) ^ {2}}{U (\xi)} = 0, \quad \lim _ {\xi \to - \infty} \frac {(V ^ {\prime} (\xi)) ^ {2}}{V (\xi)} = 0.\tag{2.23}
$$

Finally, the following identities hold true:

$$
\int_ {\mathbb {R}} U V U ^ {\prime} d \xi = - \frac {1}{6 k _ {1}}, \quad \int_ {\mathbb {R}} U V V ^ {\prime} d \xi = \frac {1}{6 k _ {2}},\tag{2.24}
$$

$$
\int_ {\mathbb {R}} V ^ {2} U ^ {\prime} d \xi = - \frac {1}{3 k _ {2}}, \quad \int_ {\mathbb {R}} U ^ {2} V ^ {\prime} d \xi = \frac {1}{3 k _ {1}}.\tag{2.25}
$$

[[PAGE 10]]
Proof. The proof of $W > 0$ and (2.24)-(2.25) follows from similar arguments as in [17, proof of Theorem 4.1 and Corollary 4.2] (see also [12]). We only prove the first identity in (2.21), the second is obtained by similar arguments. We rewrite (2.20) as

$$
U ^ {\prime \prime} = U ((k _ {1} - 1) V - W) = 0, \quad \delta V ^ {\prime \prime} = \frac {V}{\delta} ((k _ {2} - 1) U - W) = 0.\tag{2.26}
$$

Since $0 < U , V < 1$ and $W > 0$ , it follows from (2.26) that

$$
U ^ {\prime \prime} <   U (k _ {1} - 1), \qquad \delta V ^ {\prime \prime} <   \frac {(k _ {2} - 1)}{\delta} V.\tag{2.27}
$$

Now set $P = ( U ^ { \prime } ) ^ { 2 } - ( k _ { 1 } - 1 ) U ^ { 2 }$ then since $U ^ { \prime } < 0$ , we have thanks to (2.27) that $P ^ { \prime } = 2 ( U ^ { \prime } ( U ^ { \prime \prime } - ( k _ { 1 } -$ $1 ) U ) ) > 0$ . Using Lemma 2.1, we deduce that $\operatorname* { l i m } _ { \xi  + \infty } { \cal P } ( \xi ) = 0 .$ . Combining the previous facts imply that $P ( \xi ) < 0$ for all $\xi \in \mathbb { R }$ . That is $( U ^ { \prime } ) ^ { 2 } < ( k _ { 1 } - 1 ) U ^ { 2 }$ on R. But $U ^ { \prime } < 0 .$ so this latter inequality gives the first identity in (2.21). Similar arguments with $\begin{array} { r } { Q : = ( V ^ { \prime } ) ^ { 2 } - \frac { k _ { 2 } - 1 } { \delta } V ^ { 2 } } \end{array}$ at −∞ gives the second identity in (2.21). Next, from (2.20), we use again $0 < U , V < 1$ and since $k _ { 1 } , k _ { 2 } > 1$ to deduce that

$$
| U ^ {\prime \prime} | = U | 1 - U - k _ {1} V | \leq k _ {1} U, \qquad | V ^ {\prime \prime} | = \frac {V}{\delta} | 1 - V - k _ {2} U | \leq \frac {k _ {2}}{\delta} V.
$$

Hence (2.22) holds. Finally taking the square in both inequality in (2.21) while using (1.3) gives (2.23). This completes the proof. □

Proposition 2.8. Let (U, V ) be a solution to (2.20). Then we have

$$
\frac {k _ {1} ^ {2}}{6 k _ {2}} - \frac {1}{6} = \frac {1}{2} \int_ {\mathbb {R}} \frac {(- U ^ {\prime}) ^ {3}}{U ^ {2}} d \xi + \frac {1}{2} \int_ {\mathbb {R}} \frac {(- U ^ {\prime}) (U ^ {\prime \prime}) ^ {2}}{U ^ {2}} d \xi\tag{2.28}
$$

and

$$
\frac {k _ {2} ^ {2}}{6 k _ {1}} - \frac {1}{6} = \frac {\delta}{2} \int_ {\mathbb {R}} \frac {(V ^ {\prime}) ^ {3}}{V ^ {2}} d \xi + \frac {\delta^ {2}}{2} \int_ {\mathbb {R}} \frac {V ^ {\prime} (V ^ {\prime \prime}) ^ {2}}{V ^ {2}} d \xi .\tag{2.29}
$$

The four integrals are finite and the two right-hand sides are strictly positive.

Proof. We only prove (2.28), (2.29) being obtained similarly. We set

$$
S := 1 - U - k _ {1} V = - \frac {U ^ {\prime \prime}}{U},\tag{2.30}
$$

where the second equality follows from the first equation in (2.20). Then $k _ { 1 } V = 1 - U - S$ and $k _ { 1 } V ^ { \prime } =$ $- U ^ { \prime } - S ^ { \prime }$ . Next, we multiply the second identity of (2.24), by $k _ { 1 } ^ { 2 }$ to obtain

$$
\frac {k _ {1} ^ {2}}{6 k _ {2}} = \int_ {\mathbb {R}} U (1 - U - S) (- U ^ {\prime} - S ^ {\prime}) d \xi = \int_ {\mathbb {R}} U (1 - U) (- U ^ {\prime}) d \xi - \int_ {\mathbb {R}} U (1 - U) S ^ {\prime} d \xi - \int_ {\mathbb {R}} U S (- U ^ {\prime}) d \xi + \int_ {\mathbb {R}} U S S ^ {\prime} d \xi\tag{2.31}
$$

[[PAGE 11]]
With a change of variables, the first integral in (2.31) gives $\begin{array} { r } { \int _ { \mathbb { R } } U ( 1 - U ) ( - U ^ { \prime } ) d \xi = \frac { 1 } { 6 } } \end{array}$ . Using an integration by parts, the remaining three integrals give

$$
- \int_ {\mathbb {R}} (1 - U) (- U ^ {\prime}) S d \xi + \frac {1}{2} \int_ {\mathbb {R}} (- U ^ {\prime}) S ^ {2} d \xi .\tag{2.32}
$$

The boundary terms are all zero because $( U , V , S ) ( - \infty ) = ( 1 , 0 , 0 )$ and $( U , V , S ) ( + \infty ) = ( 0 , 1 , 1 - k _ { 1 } )$ Using the expression of S given in (2.30) in the first term of (2.32) and thanks again to an integration by parts, we obtain

$$
- \int_ {\mathbb {R}} (1 - U) (- U ^ {\prime}) S d \xi = \int_ {\mathbb {R}} \frac {1 - U}{U} (- U ^ {\prime}) U ^ {\prime \prime} d \xi = \frac {1}{2} \int_ {\mathbb {R}} \frac {(- U ^ {\prime}) ^ {3}}{U ^ {2}} d \xi .
$$

The boundary term vanishes at $- \infty$ because $1 - U \to 0$ and $U ^ { \prime } \to 0$ , and at $+ \infty$ because $\frac { ( U ^ { \prime } ) ^ { 2 } } { U } \to 0$ (by Lemma 2.7). The second term of (2.32) is $\begin{array} { r } { \frac { 1 } { 2 } \int _ { \mathbb { R } } ( - U ^ { \prime } ) \frac { ( U ^ { \prime \prime } ) ^ { 2 } } { U ^ { 2 } } d \xi } \end{array}$ thanks to (2.30). This proves (2.28). For (2.29), we set $\begin{array} { r } { R : = 1 - V - k _ { 2 } U = - \delta \frac { V ^ { \prime \prime } } { V } } \end{array}$ and we perform similar arguments as above.

Finally, using Lemmas 2.1 and 2.7, we can deduce that the four integrals are finite. Since $U ^ { \prime } < 0 < V ^ { \prime }$ ， the first integral in (2.28) and (2.29) is strictly positive. This completes the proof. □

Corollary 2.9. Let $k _ { 1 } , k _ { 2 } > 1$ . Assume that a standing monotone front exists for $( k _ { 1 } , k _ { 2 } , \delta )$ , then

$$
\sqrt {k _ {2}} <   k _ {1} <   k _ {2} ^ {2}.\tag{2.33}
$$

Proof. The right-hand side of (2.28) is strictly positive, so $k _ { 1 } ^ { 2 } > k _ { 2 }$ . Also, the right-hand side of (2.29) is strictly positive, so $k _ { 2 } ^ { 2 } > k _ { 1 }$ □

The following result gives another important energy identity. It is exactly the same identity in [19, Theorem 1.1] after changing the orientation. It follows by the same integrations by parts used in [17, Theorem 4.1], while keeping $k _ { 1 }$ and $k _ { 2 }$ independent.

Proposition 2.10. Let (U, V) be a monotone standing front and set $W = 1 - U - V$ . Then

$$
J := \int_ {\mathbb {R}} W ^ {2} (- U ^ {\prime}) d \xi = \int_ {\mathbb {R}} W ^ {2} V ^ {\prime} d \xi > 0\tag{2.34}
$$

and

$$
(1 - \delta) J = \frac {(k _ {1} - k _ {2}) [ (k _ {2} - 1) + \delta (k _ {1} - 1) ]}{3 k _ {1} k _ {2}}.\tag{2.35}
$$

Proof. Since $W ^ { \prime } = - U ^ { \prime } - V ^ { \prime }$ and $W ( \pm \infty ) = 0$ , we have

$$
\int_ {\mathbb {R}} W ^ {2} (- U ^ {\prime}) d \xi - \int_ {\mathbb {R}} W ^ {2} V ^ {\prime} d \xi = \int_ {\mathbb {R}} W ^ {2} W ^ {\prime} d \xi = 0
$$

which proves (2.34). Since $( U ^ { \prime } V ^ { \prime } ) ( \pm \infty ) = 0$ then $\begin{array} { r } { \int _ { \mathbb { R } } U ^ { \prime \prime } V ^ { \prime } d \xi = - \int _ { \mathbb { R } } U ^ { \prime } V ^ { \prime \prime } d \xi } \end{array}$ . We multiply the first and the second equations in (2.20) by $V ^ { \prime }$ and $U ^ { \prime }$ , respectively, we integrate over R and we combine the

[[PAGE 12]]
resulting equalities to obtain

$$
\delta \int_ {\mathbb {R}} U (1 - U - k _ {1} V) V ^ {\prime} d \xi + \int_ {\mathbb {R}} V (1 - V - k _ {2} U) U ^ {\prime} d \xi = 0.\tag{2.36}
$$

Moreover,

$$
2 U (1 - U - k _ {1} V) + W ^ {2} = (1 - V) ^ {2} - U ^ {2} - 2 (k _ {1} - 1) U V
$$

and

$$
2 V (1 - V - k _ {2} U) + W ^ {2} = (1 - U) ^ {2} - V ^ {2} - 2 (k _ {2} - 1) U V.
$$

Thus multiplying the first equality by $V ^ { \prime }$ and the second one by $U ^ { \prime }$ and integrating over R, while using (2.24)-(2.25), $\begin{array} { r } { \int _ { \mathbb { R } } ( 1 - V ) ^ { 2 } V ^ { \prime } d \xi = \frac { 1 } { 3 } } \end{array}$ and $\begin{array} { r } { \int _ { \mathbb { R } } ( 1 - U ) ^ { 2 } U ^ { \prime } d \xi = - \frac { 1 } { 3 } } \end{array}$ we arrive at

$$
2 \int_ {\mathbb {R}} U (1 - U - k _ {1} V) V ^ {\prime} d \xi + J = - \frac {(k _ {1} - 1) (k _ {1} - k _ {2})}{3 k _ {1} k _ {2}}
$$

and

$$
2 \int_ {\mathbb {R}} V (1 - V - k _ {2} U) U ^ {\prime} d \xi - J = - \frac {(k _ {2} - 1) (k _ {1} - k _ {2})}{3 k _ {1} k _ {2}},
$$

respectively. Substituting these relations in (2.36) gives (2.35).

Corollary 2.11. Let $k _ { 1 } , k _ { 2 } > 1$ and let (U, V ) be a monotone standing front. Then

$$
\mathrm{sign} (k _ {1} - k _ {2}) = \mathrm{sign} (1 - \delta),\tag{2.37}
$$

with the convention that the two sides vanish simultaneously.

Proof. In (2.35), the terms $J , ~ 3 k _ { 1 } k _ { 2 }$ and $( k _ { 2 } \mathrm { ~ - ~ } 1 ) \mathrm { ~ + ~ } \delta ( k _ { 1 } \mathrm { ~ - ~ } 1 )$ are strictly positive. The conclusion follows. □

Remark 2.12. We notice that when $k _ { 1 } = k _ { 2 }$ , we obtain from (2.37) that $\delta = 1$ . That is $d = r .$ . So a standing front can only exists when $\delta = r$ . This is a generalization of [17, Theorem 4.1].

The next result constructs the unique zero-speed threshold and completely characterizes the sign of the wave speed. A similar result was established in [21, Theorem 6.1]. We also provide explicit bounds and additional properties. We use Corollary 2.9, the monotonicity of the speed with respect to the reaction parameters established in [14] and the continuity of the front.

Proposition 2.13. For every $k _ { 2 } > 1$ and $\delta > 0$ there exists a unique number $\kappa ( \delta ; k _ { 2 } )$ such that, for every $d , r > 0$ with $\begin{array} { r } { \delta = \frac { d } { r } } \end{array}$ and every $k _ { 1 } > 1$ ，

$$
c _ {k _ {1}, k _ {2}, r, d} \left\{ \begin{array}{l l} > 0, & k _ {1} <   \mathcal {K} (\delta ; k _ {2}), \\ = 0, & k _ {1} = \mathcal {K} (\delta ; k _ {2}), \\ <   0, & k _ {1} > \mathcal {K} (\delta ; k _ {2}). \end{array} \right.\tag{2.38}
$$

[[PAGE 13]]
It satisfies $\sqrt { k _ { 2 } } < { \cal K } ( \delta ; k _ { 2 } ) < k _ { 2 } ^ { 2 }$ and $\mathcal { K } ( 1 ; k _ { 2 } ) = k _ { 2 }$ . Moreover,

$$
\alpha = \mathcal {K} (\delta ; \beta) \quad \Longleftrightarrow \quad \beta = \mathcal {K} (\delta^ {- 1}; \alpha)\tag{2.39}
$$

for every $\alpha , \beta > 1$ and $\delta > 0$

Proof. Let $k > 1$ . When $k _ { 1 } = k _ { 2 } = k$ and $d = r = 1$ we have (see e.g., [12, Theorem 1.1]) that ${ c _ { k , k , 1 , 1 } = 0 }$ Since the speed is strictly decreasing with respect to $k _ { 1 } ~ [ 1 4 ]$ , we obtain

$$
c _ {k _ {1}, k _ {2}, 1, 1} > 0 \quad \text { if } 1 <   k _ {1} <   k _ {2} \quad \text { and } \quad c _ {k _ {1}, k _ {2}, 1, 1} <   0 \quad \text { if } k _ {1} > k _ {2}.\tag{2.40}
$$

Next, fix $k _ { 2 } > 1$ and let $r = 1 , d = \delta$ . Since $1 < \sqrt { k _ { 2 } } < k _ { 2 } < k _ { 2 } ^ { 2 }$ , we can deduce from $( 2 . 4 0 )$ that when $\delta = 1$ , the speed is positive at $k _ { 1 } = \sqrt { k _ { 2 } }$ and is negative at $k _ { 1 } = k _ { 2 } ^ { 2 }$ . We claim that for all $\delta > 0$ ，

$$
c _ {\sqrt {k _ {2}}, k _ {2}, 1, \delta} > 0 \quad \text { and } \quad c _ {k _ {2} ^ {2}, k _ {2}, 1, \delta} <   0.
$$

Indeed, assume that there exists some $\delta > 0$ so that $c _ { \sqrt { k _ { 2 } } , k _ { 2 } , 1 , \delta } = 0$ . Then there is a standing front for $k _ { 1 } = \sqrt { k } _ { 2 }$ , which contradicts (2.33). Therefore, $c _ { \sqrt { k _ { 2 } } , k _ { 2 } , 1 , \delta } \neq 0$ for all $\delta > 0$ . Using Theorem 2.4, the map $\delta \mapsto c _ { \sqrt { k _ { 2 } } , k _ { 2 } , 1 , \delta }$ is continuous on the connected set $( 0 , \infty )$ and since $\delta \mapsto c _ { \sqrt { k _ { 2 } } , k _ { 2 } , 1 , 1 } > 0$ , we conclude that the first inequality in the claim holds. With similar arguments, we can deduce the second inequality in the claim. Thanks again to the continuity and the strict monotonicity of the speed with respect to $k _ { 1 }$ , we can deduce that the map $k _ { 1 } \mapsto c _ { k _ { 1 } , k _ { 2 } , 1 , \delta }$ has a unique zero $\displaystyle \mathcal { K } ( \delta ; k _ { 2 } ) \in ( \sqrt { k _ { 2 } } , k _ { 2 } ^ { 2 } )$ . This proves (2.38) with $( r , d ) = ( 1 , \delta )$ . Now, from (2.20), we have $c _ { k _ { 1 } , k _ { 2 } , r , d } = 0 \Longleftrightarrow c _ { k _ { 1 } , k _ { 2 } , 1 , \delta } = 0$ . Hence, $c _ { k _ { 1 } , k _ { 2 } , r , d } = 0 \Longleftrightarrow k _ { 1 } = \mathcal { K } ( \delta ; k _ { 2 } )$ . Using again the fact that the map $k _ { 1 } \mapsto c _ { k _ { 1 } , k _ { 2 } , r , d }$ is strictly decreasing imply that $c _ { k _ { 1 } , k _ { 2 } , r , d } > 0$ when $k _ { 1 } ~ < ~ \mathcal { K } ( \delta ; k _ { 2 } )$ and $c _ { k _ { 1 } , k _ { 2 } , r , d } \ < \ 0$ when $k _ { 1 } ~ > ~ \mathcal { K } ( \delta ; k _ { 2 } )$ . Hence (2.38) holds. Next, when $\delta = 1$ , we already know that $c _ { k _ { 2 } , k _ { 2 } , 1 , 1 } = 0$ . By uniqueness of the zero we obtain $\begin{array} { r } { \mathcal { K } ( 1 ; k _ { 2 } ) = k _ { 2 } } \end{array}$ . Finally, we recall the following exchange relation (see e.g., [18, 21]. A standing front exists for $( k _ { 1 } , k _ { 2 } , \delta ) = ( \alpha , \beta , \delta )$ if and only if a standing front exists for $( \beta , \alpha , \delta ^ { - 1 } )$ . The profiles are related by the change of variables $\tilde { U } ( \eta ) = \bar { V } ( - \sqrt { \delta } \eta )$ and $\tilde { V } ( \eta ) = U ( - \sqrt { \delta } \eta )$ . Thus using the uniqueness of the threshold, $\alpha = K ( \delta ; \beta ) \Longleftrightarrow c _ { \alpha , \beta , 1 , \delta } = 0 \Longleftrightarrow c _ { \beta , \alpha , 1 , \delta ^ { - 1 } } = 0 \Longleftrightarrow \beta = K ( \delta ^ { - 1 } ; \alpha )$ . Hence (2.39) holds. This completes the proof. □

## 3. Monotonicity of the speed with respect to the difusion ratio d

The aim of this section is to study the monotonicity of the wave speed with respect to the difusion ratio d and so to prove the Theorem 1.1. We also prove Corollary 1.2, Theorem 1.3 and finally deduce Theorem 1.4 and Corollary 1.5.

Let us fix $k _ { 1 } , k _ { 2 } > 1$ and $r > 0$ and define $\Phi : = \Phi _ { k _ { 1 } , k _ { 2 } , r , d } = ( U _ { k _ { 1 } , k _ { 2 } , r , d } , V _ { k _ { 1 } , k _ { 2 } , r , d } ) ^ { T }$ and $c : = c _ { k _ { 1 } , k _ { 2 } , r , d } .$ Let $\pi _ { 0 } : = ( k _ { 1 , 0 } , k _ { 2 , 0 } , r _ { 0 } , d _ { 0 } ) \in Q$ be fixed and consider the profile $\Phi _ { 0 } : = \Phi _ { k _ { 1 , 0 } , k _ { 2 , 0 } , r _ { 0 } , d _ { 0 } }$ associated.

We set $w = \Phi - \Phi _ { 0 }$ . Then from Theorem 2.4, $w \in C ^ { \infty } ( ( 0 , \infty ) ; H ^ { 2 } ( \mathbb { R } ) ^ { 2 } )$ and since $\Phi _ { 0 }$ does not depends on $d ,$ we define $\partial _ { d } \Phi : = \partial _ { d } w \in H ^ { 2 } ( \mathbb { R } ) ^ { 2 }$ . Moreover, (2.1) can be rewritten as

$$
\mathbf {D} _ {d} (\Phi_ {0} + w) ^ {\prime \prime} + c (d) (\Phi_ {0} + w) ^ {\prime} + \mathbf {F} _ {k _ {1}, k _ {2}, r} (\Phi_ {0} + w) = 0.\tag{3.1}
$$

[[PAGE 14]]
Diferentiating (3.1) with respect to d leads us to

$$
\left( \begin{array}{l l} 0 & 0 \\ 0 & 1 \end{array} \right) \Phi^ {\prime \prime} + \mathbf {D} _ {d} (\partial_ {d} \Phi) ^ {\prime \prime} + \partial_ {d} c \Phi^ {\prime} + c (d) (\partial_ {d} \Phi) ^ {\prime} + D \mathbf {F} _ {k _ {1}, k _ {2}, r} (\Phi) \partial_ {d} \Phi = 0.
$$

That is

$$
\mathcal {L} (\partial_ {d} \Phi) + \partial_ {d} c   \Phi^ {\prime} + \binom{0}{V ^ {\prime \prime}} = 0,\tag{3.2}
$$

where $V : = V _ { k _ { 1 } , k _ { 2 } , r , d } .$ . Recall that ker ${ \mathcal L } ^ { * } = ( \mathrm { R a n } { \mathcal L } ) ^ { \perp }$ and let $\Psi \in$ ker $\mathcal { L } ^ { \ast }$ . Then, from Proposition 2.2 we have $\Psi = ( - a , b ) ^ { T }$ with $a , b > 0$ . Thanks to Remark 2.3, we have $\langle \Psi , \Phi ^ { \prime } \rangle _ { L ^ { 2 } } > 0$ . Therefore, by taking the $L ^ { 2 }$ -scalar product with Ψ in (3.2), we obtain

$$
\left\langle \mathcal {L} (\partial_ {d} \Phi), \Psi \right\rangle_ {L ^ {2}} + \partial_ {d} c \left\langle \Phi^ {\prime}, \Psi \right\rangle_ {L ^ {2}} + \left\langle \binom{0}{V ^ {\prime \prime}}, \Psi \right\rangle_ {L ^ {2}} = 0.\tag{3.3}
$$

The first term in (3.3) is equal to 0 and since $\langle \Phi ^ { \prime } , \Psi \rangle _ { L ^ { 2 } } \neq 0$ , we deduce that

$$
\partial_ {d} c = - \frac {\left\langle \binom{0}{V ^ {\prime \prime}} , \Psi \right\rangle_ {L ^ {2}}}{\langle \Phi^ {\prime} , \Psi \rangle_ {L ^ {2}}}.
$$

That is

$$
\partial_ {d} c = - \frac {\int_ {\mathbb {R}} V ^ {\prime \prime} (\xi) b (\xi) d \xi}{\left\langle \Phi^ {\prime} , \Psi \right\rangle_ {L ^ {2}}}.\tag{3.4}
$$

Now let us recall that $\mathcal { L } \Phi ^ { \prime } = 0$ . So, if we set $p = - U ^ { \prime } > 0$ and $q = V ^ { \prime } > 0$ we obtain that $( p , q )$ solves the system

$$
\left\{ \begin{array}{l} p ^ {\prime \prime} + c p ^ {\prime} + (1 - 2 U - k _ {1} V) p + k _ {1} U q = 0, \\ d q ^ {\prime \prime} + c q ^ {\prime} + r (1 - 2 V - k _ {2} U) q + r k _ {2} V p = 0. \end{array} \right.\tag{3.5}
$$

Moreover, (a, b) obtained in Proposition 2.2 solves

$$
\left\{ \begin{array}{l} a ^ {\prime \prime} - c a ^ {\prime} + (1 - 2 U - k _ {1} V) a + r k _ {2} V b = 0, \\ d b ^ {\prime \prime} - c b ^ {\prime} + r (1 - 2 V - k _ {2} U) b + k _ {1} U a = 0, \end{array} \right.\tag{3.6}
$$

and

$$
(a, b) (\pm \infty) = 0.\tag{3.7}
$$

We can rewrite (3.4) as follows:

$$
\partial_ {d} c = - \frac {\int_ {\mathbb {R}} q ^ {\prime} (\xi) b (\xi) d \xi}{\langle \Phi^ {\prime} , \Psi \rangle_ {L ^ {2}}}.\tag{3.8}
$$

[[PAGE 15]]
Theorem 3.1. Let $k _ { 1 } , k _ { 2 } > 1 , r > 0$ and $c : = c _ { k _ { 1 } , k _ { 2 } , r , d }$ . We assume that

$$
c \leq 0 \text { and } c \left(1 - \frac {1}{d}\right) \leq 0\tag{3.9}
$$

hold. Then

$$
K := \int_ {\mathbb {R}} q ^ {\prime} (\xi) b (\xi) d \xi > 0.\tag{3.10}
$$

Proof. We first observe that an integration by parts over $\mathbb { R }$ while using Lemma 2.1 and (3.7) gives

$$
2 K = \int_ {\mathbb {R}} \left(q ^ {\prime} (\xi) b (\xi) - q (\xi) b ^ {\prime} (\xi)\right) d \xi .\tag{3.11}
$$

Now, we multiply the first equation in (3.5) by a and the first equation in (3.6) by p and we subtract the resulting equations to obtain

$$
a ^ {\prime \prime} p - p ^ {\prime \prime} a - c (p ^ {\prime} a + a ^ {\prime} p) = k _ {1} U q a - r k _ {2} V b p.
$$

since $( a ^ { \prime } p - p ^ { \prime } a ) ^ { \prime } = a ^ { \prime \prime } p - p ^ { \prime \prime } a$ , we can rewrite the previous equation as

$$
(a ^ {\prime} p - p ^ {\prime} a - c a p) ^ {\prime} = k _ {1} U q a - r k _ {2} V b p.\tag{3.12}
$$

Next, multiplying the second equation in (3.5) by b and the second equation in (3.6) by q and combining the resulting equations, we obtain

$$
[ d (q ^ {\prime} b - b ^ {\prime} q) + c b q ] ^ {\prime} = k _ {1} U q a - r k _ {2} V b p.\tag{3.13}
$$

On the one hand, combining (3.12) and (3.13) leads us to

$$
[ d (q ^ {\prime} b - b ^ {\prime} q) + c b q ] ^ {\prime} = (a ^ {\prime} p - p ^ {\prime} a - c a p) ^ {\prime}.
$$

${ \mathrm { S o } } ,$ the functions $\xi \mapsto d ( q ^ { \prime } ( \xi ) b ( \xi ) - b ^ { \prime } ( \xi ) q ( \xi ) ) + c b ( \xi ) q ( \xi )$ and $\xi \mapsto a ^ { \prime } ( \xi ) p ( \xi ) - p ^ { \prime } ( \xi ) a ( \xi ) - c a ( \xi ) p ( \xi )$ have the same derivatives. Using Lemma 2.1 and thanks to the fact that $\xi \mapsto a ^ { \prime } ( \xi )$ and $\xi \mapsto b ^ { \prime } ( \xi )$ are bounded (because $H ^ { 1 } ( \mathbb { R } ) \hookrightarrow C _ { b } ( \mathbb { R } ) )$ , we can deduce that these two functions have the same limit 0 at infinity. Therefore, these two functions must be equal. We set for all $\xi \in \mathbb { R }$

$$
G (\xi) := d (q ^ {\prime} (\xi) b (\xi) - b ^ {\prime} (\xi) q (\xi)) + c b (\xi) q (\xi) = a ^ {\prime} (\xi) p (\xi) - p ^ {\prime} (\xi) a (\xi) - c a (\xi) p (\xi).\tag{3.14}
$$

Then we have

$$
\lim _ {\xi \to \pm \infty} G (\xi) = 0 \text { and } G ^ {\prime} (\xi) = k _ {1} U (\xi) q (\xi) a (\xi) - r k _ {2} V (\xi) b (\xi) p (\xi).\tag{3.15}
$$

Diferentiating the equation in (3.15), gives

$$
G ^ {\prime \prime} = k _ {1} \left[ - p q a + U q ^ {\prime} a + U q a ^ {\prime} \right] - r k _ {2} \left[ q b p + V b ^ {\prime} p + V b p ^ {\prime} \right],\tag{3.16}
$$

[[PAGE 16]]
where we dropped the variable ξ for clarity. From (3.14), we can write $\begin{array} { r } { a ^ { \prime } = \frac { G } { p } + \frac { p ^ { \prime } } { p } a + c a } \end{array}$ and $q ^ { \prime } =$ $\begin{array} { r } { \frac { G } { d b } + \frac { b ^ { \prime } } { b } q - \frac { c } { d } q } \end{array}$ . Substituting these values in (3.16) lead us to

$$
G ^ {\prime \prime} = \left[ \left(\frac {b ^ {\prime}}{b} + \frac {p ^ {\prime}}{p}\right) G ^ {\prime} + k _ {1} U \left(\frac {a}{d b} + \frac {q}{p}\right) G + k _ {1} c \left(1 - \frac {1}{d}\right) U q a - p q (k _ {1} a + r k _ {2} b) \right].
$$

That is

$$
\mathcal {M} G := G ^ {\prime \prime} - \left(\frac {b ^ {\prime}}{b} + \frac {p ^ {\prime}}{p}\right) G ^ {\prime} - k _ {1} U \left(\frac {a}{d b} + \frac {q}{p}\right) G = q \left[ k _ {1} c \left(1 - \frac {1}{d}\right) U a - p (k _ {1} a + r k _ {2} b) \right].\tag{3.17}
$$

Since $\begin{array} { r } { k _ { 1 } , k _ { 2 } > 1 , q , U , a , p , r , b > 0 , \mathrm { i f } \ c \left( 1 - \frac { 1 } { d } \right) \le 0 , } \end{array}$ , then the right hand side of (3.17) is strictly negative. That is

$$
\mathcal {M} G (\xi) <   0 \text { for   all } \xi \in \mathbb {R}.\tag{3.18}
$$

Note that the same condition and (3.17) imply that G is not identically 0. Now, we claim that $G > 0$ on R. Indeed, suppose that there is $\xi _ { 0 } \in \mathbb { R }$ so that $G ( \xi _ { 0 } ) \leq 0$ . Then because $\operatorname* { l i m } _ { \xi  \pm \infty } G ( \xi ) = 0$ and G is continuous, G attains a nonpositive minimum at some point $\xi _ { 1 } \in \mathbb { R }$ . Thus at $\xi _ { 1 } ,$ we have

$$
G (\xi_ {1}) \leq 0, \quad G ^ {\prime} (\xi_ {1}) = 0 \text { and } G ^ {\prime \prime} (\xi_ {1}) \geq 0.
$$

Since $\begin{array} { r } { k _ { 1 } U \left( \frac { a } { d b } + \frac { q } { p } \right) > 0 } \end{array}$ , we obtain from (3.17) that $\mathcal { M } G ( \xi _ { 1 } ) \ge 0$ . This contradicts (3.18). Hence $G > 0$ on R. Now, from (3.14), we have

$$
q ^ {\prime} (\xi) b (\xi) - b ^ {\prime} (\xi) q (\xi) = \frac {1}{d} \left(G (\xi) - c b (\xi) q (\xi)\right),
$$

which combined with (3.11) imply

$$
K = \frac {1}{2 d} \int_ {\mathbb {R}} \big (G (\xi) - c b (\xi) q (\xi) \big) d \xi .
$$

Combining $G > 0$ and $c \leq 0$ , we deduce that $K > 0$ . This completes the proof.

We can now prove our main result.

Proof of Theorem 1.1. Let $k _ { 1 } , k _ { 2 } > 1$ and $r > 0$ . Then from (3.8), we have

$$
\partial_ {d} c = - \frac {\int_ {\mathbb {R}} q ^ {\prime} (\xi) b (\xi) d \xi}{\left\langle \Phi^ {\prime} , \Psi \right\rangle_ {L ^ {2}}}.
$$

Remark 2.3 implies that the denominator of the right hand side of the previous identity is strictly positive. Moreover, using Theorem 3.1, we deduce that $\begin{array} { r } { K = \int _ { \mathbb { R } } q ^ { \prime } ( \xi ) b ( \xi ) d \xi > 0 } \end{array}$ when $c \leq 0$ and $c \left( 1 - { \textstyle { \frac { 1 } { d } } } \right) \leq 0$ Hence $\partial _ { d } c < 0$ . This completes the proof. □

[[PAGE 17]]
Proof of Corollary 1.2. For the symmetric case $k _ { 1 } = k _ { 2 } = k$ , we have from Lemma 2.5 that $c \leq 0$ if and only if $d \geq r$ . So the conditions (1.5) of Theorem 1.1 are equivalent to $d \geq r$ and $d \geq 1$ or $d = r$ and $d \leq 1$ . Therefore, applying Theorem 1.1, we deduce (1.7). □

Remark 3.2. We observe from Corollary 1.2 that we have $\partial _ { d } c _ { k , k , r , d } | _ { d = r } < 0$ and from Lemma 2.5, we have $c _ { k , k , r , r } = 0$ . Because $d \mapsto c _ { k _ { 1 } , k _ { 2 } , r , d }$ is smooth on $( 0 , \infty )$ , we can deduce that this function is still strictly decreasing in a neighbourhood of $r .$ However, our result does not provide the monotonicity of the function $d \mapsto c _ { k , k , r , d }$ on the regions

$$
\left\{ \begin{array}{l l} (0, r - \varepsilon ] \cup [ r + \varepsilon , 1), & 0 <   r <   1, \\ (0, r - \varepsilon ], & r \geq 1, \end{array} \right.
$$

for some $\varepsilon > 0$ suficiently small. Therefore the global monotonicity remains an open question.

Proof of Theorem 1.3. Let us fix $k _ { 2 } > 1 , \delta _ { 0 } > 0$ and set $k _ { 1 , 0 } = \mathcal { K } ( \delta _ { 0 } ; k _ { 2 } )$ . We define $\begin{array} { r } { F ( k _ { 1 } , \delta ) : = c _ { k _ { 1 } , k _ { 2 } , 1 , \delta } . } \end{array}$ Then, thanks to Theorem 2.4, we have that F is of class $C ^ { \infty }$ on $( 1 , \infty ) \times ( 0 , \infty )$ . Moreover, Proposition 2.13 gives the existence of a unique ${ \cal K } ( \delta ; k _ { 2 } ) \in ( 1 , \infty )$ so that $F ( \mathcal { K } ( \delta ; k _ { 2 } ) , \delta ) = 0$ . Next, we let $\Phi _ { 0 } = ( U _ { 0 } , V _ { 0 } ) ^ { T }$ be the standing front at $( k _ { 1 , 0 } , k _ { 2 } , 1 , \delta _ { 0 } )$ . Diferentiating (3.1) with respect to $k _ { 1 }$ at $( k _ { 1 , 0 } , \delta _ { 0 } )$ and using similar arguments as above lead us to

$$
\partial_ {k _ {1}} F (k _ {1, 0}, \delta_ {0}) = - \frac {\int_ {\mathbb {R}} a U _ {0} V _ {0} d \xi}{\langle \Phi_ {0} ^ {\prime} , \Psi \rangle_ {L ^ {2}}},
$$

where $\Psi = ( - a , b ) ^ { T } \in$ ker $\mathcal { L } ^ { \ast }$ with $a , b > 0$ . Using Remark 2.3, we have that the denominator of the previous equality is strictly positive. The numerator is also positive because $a , U _ { 0 } , V _ { 0 } > 0$ . This implies that $\partial _ { k _ { 1 } } F ( k _ { 1 , 0 } , \delta _ { 0 } ) < 0$ . Hence $\partial _ { k _ { 1 } } F ( k _ { 1 , 0 } , \delta _ { 0 } ) \neq 0$ . We apply the implicit function theorem to deduce the existence of two intervals $I \subset ( 0 , \infty )$ and $J \subset ( 1 , \infty )$ containing respectively $\delta _ { 0 }$ and $k _ { 1 , 0 }$ and a unique function $\kappa \in C ^ { \infty } ( I ; J )$ such that

$$
\kappa (\delta_ {0}) = k _ {1, 0} \quad \text { and } \quad F (\kappa (\delta), \delta) = 0, \quad \text { for   every } \delta \in I.
$$

The uniqueness of the threshold given in Proposition 2.13 implies that $\kappa ( \delta ) = \mathcal { K } ( \delta ; k _ { 2 } )$ for all $\delta \in I$ . So, $\delta \mapsto \mathcal { K } ( \delta ; k _ { 2 } )$ is of class $C ^ { \infty }$ in the neighbourhood of $\delta _ { 0 }$ . Since $\delta _ { 0 }$ was arbitrary, it follows that $\delta \mapsto \mathcal { K } ( \delta ; k _ { 2 } )$ is of class $C ^ { \infty }$ on $( 0 , \infty )$

Now, let $\Phi = ( U , V ) ^ { T }$ be the standing front at $( k _ { 1 } , k _ { 2 } , r , d ) = ( \mathcal { K } ( \delta ; k _ { 2 } ) , k _ { 2 } , 1 , \delta )$ . Diferentiating (2.20) with respect to δ gives

$$
\mathcal {L} _ {0} (\partial_ {\delta} \Phi) - \partial_ {\delta} \mathcal {K} \binom{U V}{0} + \binom{0}{V ^ {\prime \prime}} = 0,\tag{3.19}
$$

where $\mathcal { L } _ { 0 } h : = \mathbf { D } _ { \delta } h ^ { \prime \prime } + D \mathbf { F } _ { \mathcal { K } , k _ { 2 } , r } h$ . Using Proposition 2.2 with $c = 0$ , we take the $L ^ { 2 } .$ -scalar product with $\Psi = ( - a , b ) ^ { T } \in$ ker $\mathcal { L } _ { 0 } ^ { \ast }$ in (3.19), we obtain

$$
\partial_ {\delta} \mathcal {K} \int_ {\mathbb {R}} a U V d \xi + \int_ {\mathbb {R}} b V ^ {\prime \prime} d \xi = 0.
$$

[[PAGE 18]]
That is

$$
\partial_ {\delta} \mathcal {K} (\delta ; k _ {2}) = - \frac { \int_ {\mathbb {R}} b V ^ {\prime \prime} d \xi}{ \int_ {\mathbb {R}} a U V d \xi}.\tag{3.20}
$$

Since $c = 0 , r = 1$ and $d = \delta$ , the proof of Theorem 3.1 gives $W : = G = a ^ { \prime } p - a p ^ { \prime } = \delta ( b q ^ { \prime } - b ^ { \prime } q ) > 0$ and $\int _ { \mathbb { R } } b V ^ { \prime \prime } d \xi = \frac { 1 } { 2 d } \int _ { \mathbb { R } } W ( \xi ) d \xi > 0$ . Substituting this expression in (3.20) gives

$$
\partial_ {\delta} \mathcal {K} (\delta ; k _ {2}) = - \frac {\int_ {\mathbb {R}} W d \xi}{2 \delta \int_ {\mathbb {R}} a U V d \xi} <   0.
$$

So, (1.11) holds and $\delta \mapsto \mathcal { K } ( \delta , k _ { 2 } )$ is a decreasing bijection. (1.8) and (1.9) follow from Proposition 2.13. Now, it remains to establish the limits in (1.10). These two endpoint limits are also contained in the recent work [19, Theorem 1.3].

We first prove the limit at zero. We note that in [2, Theorem 23 and Remark 24], the competition coeficients $\alpha$ and $\beta$ corresponds respectively to $k _ { 1 }$ and $k _ { 2 }$ , their growth coeficient is equal to 1 and their difusion coeficient $\varepsilon ^ { 2 }$ corresponds to δ here. Moreover, their front has the opposite orientation to ours. $\mathrm { S o } .$ after reversing the sign of the speed, their result imply that for every fixed $k _ { 1 } \neq k _ { 2 } ^ { 2 }$ 2

$$
\mathrm{sign} (c _ {k _ {1}, k _ {2}, 1, \delta}) = \mathrm{sign} (k _ {2} ^ {2} - k _ {1}),\tag{3.21}
$$

for all $\delta > 0$ suficiently small. Let $0 < \eta < k _ { 2 } ^ { 2 } - 1$ . Then applying (3.21) with $k _ { 1 } = k _ { 2 } ^ { 2 } - \eta > 1$ , we obtain for all $\delta > 0$ suficiently small

$$
c _ {k _ {2} ^ {2} - \eta , k _ {2}, 1, \delta} > 0.
$$

Similarly, applying (3.21) with $k _ { 1 } = k _ { 2 } ^ { 2 } + \eta > 1$ gives

$$
c _ {k _ {2} ^ {2} + \eta , k _ {2}, 1, \delta} <   0.
$$

Thanks to (2.38), we can deduce from the above identities that for all $\delta > 0$ suficiently small,

$$
k _ {2} ^ {2} - \eta <   \mathcal {K} (\delta ; k _ {2}) <   k _ {2} ^ {2} + \eta .
$$

Since $\eta > 0$ is arbitrary, we conclude that

$$
\lim _ {\delta \downarrow 0} \mathcal {K} (\delta ; k _ {2}) = k _ {2} ^ {2}.\tag{3.22}
$$

Now, we prove the limit at +∞. We first observe that since $\delta \mapsto \mathcal { K } ( \delta ; k _ { 2 } )$ is strictly decreasing and bounded below by $\sqrt { k _ { 2 } }$ , the limit $\Lambda : = \operatorname* { l i m } _ { \delta  + \infty } \kappa ( \delta ; k _ { 2 } )$ exists and is such that $\Lambda \geq \sqrt { k _ { 2 } } > 1$ . We let $\delta = \varepsilon ^ { - 1 }$ and we define define $\kappa _ { \varepsilon } : = \mathcal { K } ( \varepsilon ^ { - 1 } ; k _ { 2 } )$ . Then $\operatorname* { l i m } _ { \epsilon \downarrow 0 } \kappa _ { \varepsilon } = \Lambda$ . Thanks to (2.39), we have $\begin{array} { r } { \mathcal { K } ( \varepsilon ; \kappa _ { \varepsilon } ) = k _ { 2 } } \end{array}$ . We claim that for all $\varepsilon > 0$ , the function $\beta \mapsto \mathcal { K } ( \varepsilon ; \beta )$ is strictly increasing. Indeed, let $\beta _ { 1 } < \beta _ { 2 }$ and set $\alpha _ { 1 } : = \mathcal { K } ( \varepsilon ; \beta _ { 1 } )$ . Then, $c _ { \alpha _ { 1 } , \beta _ { 1 } , 1 , \varepsilon } = 0$ . Since the speed is strictly increasing with respect to k<sub>2</sub> [14], we have $c _ { \alpha _ { 1 } , \beta _ { 2 } , 1 , \varepsilon } > 0$ . We deduce from (2.38), that $\alpha _ { 1 } < \mathcal { K } ( \varepsilon ; \beta _ { 2 } )$ . Hence $K ( \varepsilon ; \beta _ { 1 } ) < K ( \varepsilon ; \beta _ { 2 } )$ . This proves the claim. Now, let $0 < \eta < \Lambda - 1$ . For $\varepsilon > 0$ suficiently small, we have $\Lambda - \eta < \kappa _ { \varepsilon } < \Lambda + \eta$ . Thus, using the previous monotonicity, we obtain

[[PAGE 19]]
$$
\mathcal {K} (\varepsilon ; \Lambda - \eta) <   \mathcal {K} (\varepsilon ; \kappa_ {\varepsilon}) <   \mathcal {K} (\varepsilon ; \Lambda + \eta).
$$

That is

$$
\mathcal {K} (\varepsilon ; \Lambda - \eta) <   k _ {2} <   \mathcal {K} (\varepsilon ; \Lambda + \eta).\tag{3.23}
$$

We note that $\Lambda - \eta , \Lambda + \eta > 1$ . Then, we take the limit $\mathrm { a s } \varepsilon \downarrow 0$ in (3.23) and use (3.22) to deduce that

$$
(\Lambda - \eta) ^ {2} \leq k _ {2} \leq (\Lambda + \eta) ^ {2}.
$$

Finally, letting $\eta \downarrow 0$ in the previous inequality gives $\Lambda ^ { 2 } = k _ { 2 }$ . Hence, $\operatorname* { l i m } _ { \delta  + \infty } \kappa ( \delta ; k _ { 2 } ) = \sqrt { k _ { 2 } }$ . This completes the proof. □

We now prove the Theorem 1.4.

Proof of Theorem 1.4. Firstly, if $k _ { 1 } \leq \sqrt { k _ { 2 } }$ , then $k _ { 1 } < \mathcal { K } ( \delta ; k _ { 2 } )$ by Proposition 2.13, and so $c _ { k _ { 1 } , k _ { 2 } , r , d } > 0$ by (2.38). Next, if $k _ { 1 } \geq k _ { 2 } ^ { 2 }$ , then $k _ { 1 } > { \mathcal { K } } ( \delta ; k _ { 2 } )$ and hence $c _ { k _ { 1 } , k _ { 2 } , r , d } < 0$ . Now, assume that $\sqrt { k _ { 2 } } < \dot { k _ { 1 } } < k _ { 2 } ^ { 2 }$ By Theorem 1.3, the function $\delta \mapsto \mathcal { K } ( \delta ; k _ { 2 } )$ is a strictly decreasing bijection from $( 0 , \infty )$ onto $( \sqrt { k _ { 2 } } , k _ { 2 } ^ { 2 } )$ Hence, there exist a unique $\delta ^ { * } > 0$ so that ${ \cal K } ( \delta ^ { * } ; k _ { 2 } ) = k _ { 1 }$ . Using (2.38), we obtain

$$
c _ {k _ {1}, k _ {2}, r, d} \left\{ \begin{array}{l l} > 0, & 0 <   \frac {d}{r} <   \delta^ {*}, \\ = 0, & \frac {d}{r} = \delta^ {*}, \\ <   0, & \frac {d}{r} > \delta^ {*}. \end{array} \right.
$$

Finally, the front associated with $( k _ { 1 } , k _ { 2 } , \delta ^ { * } )$ is standing, so (2.37) gives sign $( \delta ^ { * } - 1 ) = \mathrm { s i g n } ( k _ { 2 } - k _ { 1 } )$ . This completes the proof. □

We end this paper with the proof of Corollary 1.5.

Proof of Corollary 1.5. Firstly, we assume that $k _ { 1 } \geq k _ { 2 } ^ { 2 }$ . Then Theorem 1.4 gives $c _ { k _ { 1 } , k _ { 2 } , r , d } < 0$ for every $d > 0$ . If $d \geq 1$ , then $\begin{array} { r } { c _ { k _ { 1 } , k _ { 2 } , r , d } \left( 1 - \frac { 1 } { d } \right) \leq 0 } \end{array}$ . We thus apply Theorem 1.1 to deduce that $\partial _ { d } c _ { k _ { 1 } , k _ { 2 } , r , d } < 0$ for every $d \geq 1$ . Thus (i) holds. Now, assume that $\sqrt { k _ { 2 } } < k _ { 1 } < k _ { 2 } ^ { 2 }$ and let $d ^ { * } : = r \delta ^ { * } ( k _ { 1 } , k _ { 2 } )$ . Then by Theorem 1.4, we have

$$
c _ {k _ {1}, k _ {2}, r, d} \left\{ \begin{array}{l l} > 0, & 0 <   d <   d ^ {*}, \\ = 0, & d = d ^ {*}, \\ <   0, & d > d ^ {*}. \end{array} \right.\tag{3.24}
$$

at $d = d { * } , c _ { k _ { 1 } , k _ { 2 } , r , d } = 0$ and the assumptions of Theorem 1.1 are satisfied, so $\partial _ { d } c _ { k _ { 1 } , k _ { 2 } , r , d } | _ { d = d ^ { * } } < 0$ . Next, suppose that $d ^ { * } \geq 1$ . Then for every $d > d ^ { * } , d \geq 1$ and by (3.24) we obtain $c _ { k _ { 1 } , k _ { 2 } , r , d } < 0$ . In addition, $\begin{array} { r } { c _ { k _ { 1 } , k _ { 2 } , r , d } \left( 1 - \frac { 1 } { d } \right) \leq 0 } \end{array}$ . So, Theorem 1.1 gives $\partial _ { d } c _ { k _ { 1 } , k _ { 2 } , r , d } < 0$ for all $d \geq d ^ { * }$ . Hence, $d \mapsto c _ { k _ { 1 } , k _ { 2 } , r , d }$ is strictly decreasing on $[ d ^ { * } , \infty )$ . Finally, suppose that $d ^ { * } < 1$ . Then for every $d \geq 1$ , we have $d > d ^ { * }$ and (3.24) implies $c _ { k _ { 1 } , k _ { 2 } , r , d } < 0$ . We have again $\begin{array} { r } { c _ { k _ { 1 } , k _ { 2 } , r , d } \left( 1 - \frac { 1 } { d } \right) \leq 0 } \end{array}$ . Theorem 1.1 implies $\partial _ { d } c _ { k _ { 1 } , k _ { 2 } , r , d } < 0$ for all $d \geq 1$ . Thus, $d \mapsto c _ { k _ { 1 } , k _ { 2 } , r , d }$ is strictly decreasing on [1, ∞). This completes the proof. □

[[PAGE 20]]
## References

[1] M. Alfaro and D. Xiao. Lotka–volterra competition-difusion system: the critical competition case. Communications in Partial Diferential Equations, 48(2):182–208, 2023.

[2] E. O. Alzahrani, F. A. Davidson, and N. Dodds. Travelling waves in near-degenerate bistable competition models. Mathematical modelling of natural phenomena, 5(5):13–35, 2010.

[3] E. O. Alzahrani, F. A. Davidson, and N. Dodds. Reversing invasion in bistable systems. Journal of mathematical biology, 65(6):1101–1124, 2012.

[4] C. Carr\`ere. Spreading speeds for a two-species competition-difusion system. Journal of Diferential Equations, 264(3):2133–2156, 2018.

[5] M.-S. Chang, C.-C. Chen, and S.-C. Wang. Propagating direction in the two species Lotka-Volterra competition-difusion system. Discrete and Continuous Dynamical Systems-B, 28(12):5998–6014, 2023.

[6] C.-C. Chen and S.-C. Wang. Propagation Direction Near the Strong-Competition Borderline in the Two-Species Lotka-Volterra Model. arXiv preprint arXiv:2607.03066, 2026.

[7] C. Conley and R. Gardner. An application of the generalized morse index to travelling wave solutions of a competitive reaction-difusion model. Indiana University mathematics journal, 33(3):319–343, 1984.

[8] R. A. Gardner. Existence and stability of travelling wave solutions of competition models: a degree theoretic approach. Journal of Diferential equations, 44(3):343–364, 1982.

[9] L. Girardin. The efect of random dispersal on competitive exclusion–A review. Mathematical Biosciences, 318:108271, 2019.

[10] L. Girardin and G. Nadin. Travelling waves for difusive and strongly competitive systems: relative motility and invasion speed. European Journal of Applied Mathematics, 26(4):521–534, 2015.

[11] L. Girardin and G. Nadin. Competition in periodic media: II–Segregative limit of pulsating fronts and “Unity is not Strength”-type result. Journal of Diferential Equations, 265(1):98–156, 2018.

[12] J.-S. Guo and Y.-C. Lin. The sign of the wave speed for the Lotka-Volterra competition-difusion system. Communications on Pure & Applied Analysis, 12(5):2083–2090, 2013.

[[PAGE 21]]
[13] Y. Hosono. The minimal speed of traveling fronts for a difusive lotka-volterra competition model. Bulletin of Mathematical Biology, 60(3):435–448, 1998.

[14] Y. Kan-On. Parameter dependence of propagation speed of travelling waves for competition-difusion equations. SIAM journal on mathematical analysis, 26(2):340–363, 1995.

[15] Y. Kan-On and Q. Fang. Stability of monotone travelling waves for competition-difusion equations. Japan Journal of Industrial and Applied Mathematics, 13(2):343–349, 1996.

[16] Y. Kan-on and E. Yanagida. Existence of nonconstant stable equilibria in competition-difusion equations. Hiroshima mathematical journal, 23(1):193–221, 1993.

[17] C. Kenne. Complete characterization of the sign of the wave speed in the symmetric lotka-volterra system under strong competition. arXiv preprint arXiv:2608.16845, 2026.

[18] M. Ma, Z. Huang, and C. Ou. Speed of the traveling wave for the bistable Lotka–Volterra competition model. Nonlinearity, 32(9):3143–3162, 2019.

[19] S. Ma, D. Xiao, and M. Zhou. Propagation direction of bistable traveling fronts in the lotka–volterra competition–difusion system. arXiv preprint arXiv:2608.20795, 2026.

[20] Y. Morita, K.-I. Nakamura, and T. Ogiwara. Front propagation and blocking for the competitiondifusion system in a domain of half-lines with a junction. Discrete and Continuous Dynamical Systems-B, 28(12):6345–6361, 2023.

[21] K.-I. Nakamura and T. Ogiwara. Propagation speed of bistable traveling waves in difusive Lotka– Volterra systems with strong competition. Partial Diferential Equations and Applications, 7(4):33, 2026.

[22] R. Peng, C.-H. Wu, and M. Zhou. Sharp estimates for the spreading speeds of the lotka-volterra difusion system with strong competition. 38(3):507–547, 2021.

[23] E. Risler. Competition between stable equilibria in reaction-difusion systems: the influence of mobility on dominance. arXiv preprint arXiv:1703.02159, 2017.

[24] M. Rodrigo and M. Mimura. Exact solutions of a competition-difusion system. Hiroshima Mathematical Journal, 30(2):257–270, 2000.

[25] M. Rodrigo and M. Mimura. Exact solutions of reaction-difusion systems and nonlinear wave equations. Japan Journal of Industrial and Applied Mathematics, 18(3):657–696, 2001.

[26] A. I. Vol’pert, V. A. Volpert, and V. A. Volpert. Traveling wave solutions of parabolic systems, volume 140. American Mathematical Soc., 1994.

[27] D. Xiao. Suficient conditions for determining the sign of the wave speed in the Lotka-Volterra competition system. Journal of Diferential Equations, 424:208–228, 2025.
