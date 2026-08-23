[[PAGE 1]]
# 4-DIMENSIONAL SKEIN MODULES, HANDLE ATTACHMENTS, AND TANGLES


[[PAGE 2]]
GAGE MARTIN, MARY STELOW, AND MIRA WATTAL

Abstract. Skein lasagna modules are a recent tool developed for the study of 4-manifolds. We provide general formula for 1-, 2-, and 3-handle attachments for skein modules defined with any functorial link theory in $S ^ { 3 } \times I$ generalizing existing formula of Chen, Manolescu-Neithalath, Manolescu-Walker-Wedrich, and Ren-Willis. These formula are derived from a complete description of the gluing homomorphism on skein modules. For this description, we introduce a variation of these skein modules in the presence of distinguished 3-manifolds in the boundary. A similar construction was recently introduced independently by Blackwell-Krushkal-Luo.

## 1. Introduction

Motivated by constructions in the study of 3-manifolds, Morrison-Walker-Wedrich [6] introduced a version of a skein module for a 4-manifold X with a framed, oriented link L in its boundary: the skein lasagna module of $( X ; L )$ This invariant is typically denoted by $S ^ { \star } ( X ; L )$ , where the star indicates a choice of an input functorial link homology theory $H ^ { \star }$ for links in $S ^ { 3 }$ . When such a theory is fixed in our exposition, we will denote in place of the star. For example, we will denote the input of Khovanov-Rozansky ${ \mathfrak { g l } } _ { 2 } .$ -homology as $S ^ { 2 } ( X ; L )$ When such a theory is ambiguous, we assume that it satisfies a few additional conditions, which we have included in Section 2.

Since their introduction, skein lasagna modules have had applications to the study of 4-manifolds [7, 9, 10], most notably in Ren-Willis’s gauge theory-free proof of the existence of homeomorphic but not diffeomorphic 4-manifolds [8]. Many of these applications rely on understanding the behavior of skein lasagna modules under various handle attachments. This behavior was first described in the case of 2-handles for Khovanov-Rozansky ${ \mathfrak { g l } } _ { n }$ -homology by Manolescu-Neithalath [4]. Later formulae have also been worked out for 2-handles with other choices of link theories, as well as for 1- and 3-handles for ${ \mathfrak { g l } } _ { n }$ -homology again [2, 5, 8].

We extend and package these results into formulae for 1-,2-, and 3-handle attachments for a general choice of functorial link theory. Our results can be summed into the following theorems. A more careful treatment of these results appears in Examples 5.1, 5.2, and 5.3 respectively.

Theorem 1.1. $I f X _ { 1 }$ is obtained from X by the addition of a 1-handle along $S ^ { 0 } \times B ^ { 3 }$ and $T$ is the tangle obtained from L by cutting along the cocore of the 1-handle, then $S ^ { \star } ( X _ { 1 } ; L )$ is the 0-th Hochschild homology of a bimodule associated to the triple: $( X ; S ^ { 0 } \times B ^ { 3 } ; T )$ . The bimodule structure is deduced from the action by an algebra associated to $S ^ { 0 } \times B ^ { 3 }$

Theorem 1.2. $I f X _ { 1 }$ is obtained from X by the addition of a 2-handle along $S ^ { 1 } \times D ^ { 2 }$ , then $S ^ { \star } ( X _ { 1 } ; L )$ can be obtained by “cabling” a module associated to the triple: $( X ; S ^ { 1 } \times D ^ { 2 } ; \mathcal { O } )$ . The cabling relations are deduced from an action by an algebra associated to $S ^ { 1 } \times D ^ { 2 }$

Theorem 1.3. $I f X _ { 1 }$ is obtained from X by the addition of a 3-handle along $S ^ { 2 } \times D ^ { 1 }$ , then $S ^ { \star } ( X _ { 1 } ; L )$ is the quotient of a module associated to the triple: $( X ; S ^ { 2 } \times D ^ { 1 } ; \mathcal { O } )$ . The relations are deduced from an action by an algebra associated to $S ^ { 2 } \times D ^ { 1 }$

Our handle attachment formulae all follow as specific cases of a general gluing formula, which is Theorem 4.1. As above, we have summed its technical content below.

Theorem 1.4. Let the 4-manifold and link pair $( X ; T _ { 1 } \cup T _ { 2 } )$ be the result of gluing 4-manifold, 3-manifold, and tangle triples $\left( X _ { 1 } ; Y ; T _ { 1 } \right)$ and $\left( X _ { 2 } ; Y ; T _ { 2 } \right)$ along a 3-manifold Y . Then, the skein lasagna module of $( X ; T _ { 1 } \cup T _ { 2 } )$ can be obtained as a bimodule tensor product of a left module associated to $\left( X _ { 1 } ; Y ; T _ { 1 } \right)$ and a right module associated to $\left( X _ { 2 } ; Y ; T _ { 2 } \right)$ .

The gluing formula involves the technology of a skein lasagna module associated to a parameterized triple, which we will introduce in Section 3. It is a variation of the existing skein module invariants associated to

4-manifolds, concocted precisely for its versatility in describing the cutting and pasting of 4-manifolds. A similar construction was introduced independently by Blackwell-Krushkal-Luo to study trisections [1].

## 2. Notation

We always work with skein lasagna modules $S ^ { \star } ( X ; L )$ defined using functorial link homology theories that satisfy these minimal conditions:

(1) the theories are strictly monoidal with respect to disjoint unions and tensor products; and

(2) the theories can be extended to framed, oriented links in abstract $S ^ { 3 }$ and link cobordisms in abstract $S ^ { 3 } \times I ^ { }$

These conditions are borrowed and subsequently abridged from $[ 6 , 8 ]$ We often but not always denote Khovanov-Rozansky ${ \mathfrak { g l } } _ { n }$ -homology by $\operatorname { K h R } _ { n } .$ , Khovanov homology by Kh, and any ambiguous functorial link homology theory by $H ^ { \star }$ . Finally, we implicitly fix the ground ring to be a field k.

## 3. The skein lasagna module of a triple

To formally state our gluing formula, we require an extension of skein lasagna modules to 4-manifold, 3-manifold, and tangle triples. Our extension comes equipped with an action by an algebra associated to the 3-manifold and also specializes to Khovanov’s tangle invariant in a precise sense.

Explicitly, let X be an oriented 4-manifold with boundary; $\phi \colon Y  \partial X$ be an orientation-preserving embedding of a compact, oriented 3-manifold Y that extends to some fixed framing; and T be a framed, oriented tangle in $\partial X \setminus \phi ( \operatorname { i n t } ( Y ) )$ , whose boundary meets $\phi ( \partial Y )$ in a compatibly framed, oriented collection $P .$ We additionally assume that T intersects each component of $\phi ( Y )$ generically with trivial algebraic intersection. This data specifies a module associated to the parameterized triple: $( X ; ( Y , \phi ) ; T )$

Definition 3.1 (The skein lasagna module of a triple). Let $T _ { Y } ~ \subset ~ Y$ be any embedded, framed tangle whose boundary is the compatibly framed, oriented collection $- \phi ^ { - 1 } ( P )$ . To $T _ { Y }$ , we associate a skein lasagna module $S ^ { \star } ( X ; T \cup _ { P } \phi ( T _ { Y } ) )$ . Skein lasagna modules such as these assemble into a k-module:

$$
S ^ { \star } ( X ; Y ; T ) : = \bigoplus _ { T _ { Y } } S ^ { \star } ( X ; T \cup _ { P } \phi ( T _ { Y } ) ) ,
$$

which we define to be the skein lasagna module of $( X ; Y ; T )$

Warning 3.2. Though the 3-manifold Y in Definition 3.1 is specified by an explicit embedding and framing into $\partial X .$ , we suppress the parameterizing map in our notation to prioritize being less verbose. We will continue to abbreviate our notation in this way; however, the reader should remain eagle-eyed of the fact that Y is not abstract.

We can promote $S ^ { \star } ( X ; Y ; T )$ to a right-module over a k-algebra associated to Y and P , which we also take to be the skein lasagna module of $( X ; Y ; T )$

Definition 3.3 (The algebra associated to a 3-manifold). To a pair of framed, oriented tangles $T _ { Y } ^ { 0 }$ and $T _ { Y } ^ { 1 }$ embedded in Y with the same boundary conditions as in Definition 3.1, we associate a skein lasagna module $S ^ { \star } ( Y \times I ; - T _ { Y } ^ { 0 } \cup _ { \phi ^ { - 1 } ( P ) } T _ { Y } ^ { 1 } )$ , where $T _ { Y } ^ { 0 } \subset Y \times 0 , T _ { Y } ^ { 1 } \subset Y \times 1$ , and $- T _ { Y } ^ { 0 } \cup _ { \phi ^ { - 1 } ( P ) } T _ { Y } ^ { 1 }$ is the framed, oriented link indicated by the gluing

$$
- T _ { Y } ^ { 0 } \cup _ { \phi ^ { - 1 } ( P ) \times 0 } ( - \phi ^ { - 1 } ( P ) \times I ) \cup _ { \phi ( P ) \times 1 } T _ { Y } ^ { 1 } .
$$

Skein lasagna modules such as these assemble into a k-algebra:

$$
S ^ { \star } ( Y ; P ) : = \bigoplus _ { T _ { Y } ^ { 0 } , T _ { Y } ^ { 1 } } S ^ { \star } ( Y \times I ; - T _ { Y } ^ { 0 } \cup _ { \phi ^ { - 1 } ( P ) } T _ { Y } ^ { 1 } ) ,
$$

whose multiplication is defined on a pair of fillings $S _ { 1 }$ and $S _ { 2 }$ in $S ^ { * } ( Y ; P )$ according to the following rule:

$$
S _ { 1 } \cdot S _ { 2 } : = \left\{ \begin{array} { l l } { S _ { 1 } \cup _ { S _ { 1 } \cap Y \times \{ 1 \} } S _ { 2 } = S _ { 1 } \cup _ { S _ { 2 } \cap Y \times \{ 0 \} } S _ { 2 } } & { \mathrm { i f ~ } S _ { 1 } \cap Y \times \{ 1 \} = - ( S _ { 2 } \cap Y \times \{ 0 \} ) } \\ { 0 } & { \mathrm { o t h e r w i s e . } } \end{array} \right.
$$

The algebra comes equipped with local units, which are specified by finite sums of cylinders on tangles with the same embedding and boundary conditions as before.

<!-- image-->  

[[PAGE 3]]
Figure 1. Multiplication in $\mathrm { K h R } _ { \star }$

The k-algebra in Definition 3.3 acts on $S ^ { \star } ( X ; Y ; T )$ on the right in the evident way, according to a similar rule as multiplication in $S ^ { \star } ( Y ; P )$

Remark 3.4. If instead we were given an orientation-preserving map $\phi : - Y \to \partial X$ extending to a possibly different fixed framing and a compatibly framed, oriented tangle $T$ with boundary $- P .$ , then we could collect the skein lasagna modules $S ^ { \star } ( X ; - \phi ( T _ { Y } ) \cup _ { P } T )$ , where $T _ { Y }$ ranges over all framed, oriented tangles in Y with compatibly framed, oriented boundary $- \phi ^ { - 1 } ( P )$ These modules would assemble into a $l e f t$ module over $S ^ { \star } ( Y ; P )$ We will henceforth refer to the right and left counterparts of $S ^ { \star } ( X ; Y ; T )$ using the same notation. Context will make clear which module structure is present.

Example 3.5 (Test case). One of the simplest examples of a skein lasagna module of $( X ; Y ; T )$ occurs when $X = B ^ { 4 } , Y = B ^ { 3 }$ , and $\star = 2$ . In this case, both the module associated to $( B ^ { 4 } ; B ^ { 3 } ; T )$ and the algebra associated to $( B ^ { 3 } ; P )$ can be rewritten as direct sums of ${ \mathfrak { g l } } _ { 2 } .$ -homologies:

$$
S ^ { 2 } ( B ^ { 4 } ; B ^ { 3 } ; T ) \cong \bigoplus _ { T _ { Y } } { \mathrm { K h R } } _ { 2 } ( T \cup _ { P } T _ { Y } ) , \quad \mathrm { a n d } \quad S ^ { 2 } ( B ^ { 3 } ; P ) \cong \bigoplus _ { T _ { Y } ^ { 0 } , T _ { Y } ^ { 1 } } { \mathrm { K h R } } _ { 2 } ( - T _ { Y } ^ { 0 } \cup _ { P } T _ { Y } ^ { 1 } ) .
$$

Note that we ignore the parametrization of $B ^ { 3 }$ in $S ^ { 3 }$ as it is unambiguous.

The above equivalences are consequences of the evaluation isomorphism

$$
\operatorname { e v } \colon S ^ { 2 } ( B ^ { 4 } ; L ) \to \operatorname { K h R } _ { 2 } ( L ) ,
$$

which was originally defined by Morrison-Walker-Wedrich in [6]. They can be further enhanced into mappings that intertwine the $S ^ { 2 } ( B ^ { 3 } ; P )  – \mathrm { a c t i o n } ^ { 1 }$ on either side, after defining a multiplication on the right hand side of the second equivalence.

Explicitly, let $v \in \mathrm { K h R } _ { 2 } ( - T _ { Y } ^ { 0 } \cup _ { P } T _ { Y } ^ { 1 } )$ and $w \in \mathrm { K h R } _ { 2 } ( - T _ { Y } ^ { 2 } \cup _ { P } T _ { Y } ^ { 3 } )$ be two elements in $S ^ { \star } ( Y ; P )$ . If $T _ { Y } ^ { 1 } \neq { \bar { T } } _ { Y } ^ { 2 }$ then set the multiplication v · w to be zero. Otherwise, define v · w to be the image of v ⊗ w under “vertical composition”, which is (again) borrowed from [6] and described by picture in Figure 1. In words, vertical composition is induced by a link cobordism, which has ingoing boundary $- T _ { Y } ^ { 0 } \cup _ { P } T _ { Y } ^ { 1 } \sqcup - T _ { Y } ^ { 1 } \cup _ { P } T _ { Y } ^ { 2 }$ and outgoing boundary $- T _ { Y } ^ { 0 } \cup { \dot { T _ { Y } } } ^ { 2 }$ . It is cylindrical on the top and the bottom and $T _ { Y } ^ { 1 } \times$ semicircle in the middle.

Altogether, the above discussion can be summed by the below lemma, which connects the multiplication of fillings on the left with the vertical composition of ${ \mathfrak { g l } } _ { 2 }$ -homologies on the right.

Lemma 3.6. The evaluation isomorphism specifies a k-algebra isomorphism:

$$
S ^ { 2 } ( B ^ { 3 } ; P ) \cong \bigoplus _ { T _ { Y } ^ { 0 } , T _ { Y } ^ { 1 } } \mathrm { \mathrm { K h R } R } _ { 2 } ( - T _ { Y } ^ { 0 } \cup _ { P } T _ { Y } ^ { 1 } )
$$

and subsequently, an isomorphism of $S ^ { 2 } ( B ^ { 3 } ; P )$ -modules:

$$
S ^ { 2 } ( B ^ { 4 } ; B ^ { 3 } ; T ) \cong \bigoplus _ { T _ { Y } } \mathrm { K h R } _ { 2 } ( T \cup _ { P } T _ { Y } ) .
$$


[[PAGE 4]]
Proof. Both isomorphisms in Lemma 3.6 follow from similar pictures, so we only substantiate the first. The first isomorphism expresses a collection of commutative diagrams:

$$
\begin{array} { r l r } { S ^ { 2 } ( B ^ { 3 } \times I ; - T _ { Y } ^ { 0 } \cup _ { P } T _ { Y } ^ { 1 } ) \otimes S ^ { 2 } ( B ^ { 3 } \times I ; - T _ { Y } ^ { 1 } \cup _ { P } T _ { Y } ^ { 2 } ) \xrightarrow { \textnormal { e v \otimes e v } } \mathrm { K h R } _ { 2 } ( - T _ { Y } ^ { 0 } \cup _ { P } T _ { Y } ^ { 1 } ) \otimes \mathrm { K h R } _ { 2 } ( - T _ { Y } ^ { 1 } \cup _ { P } T _ { Y } ^ { 2 } ) } & \\ { \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad } \\ { S ^ { 2 } ( B ^ { 3 } \times I ; - T _ { Y } ^ { 0 } \cup _ { P } T _ { Y } ^ { 2 } ) \xrightarrow { \textnormal { e v } } } & { \mathrm { e v } } & { \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad } \end{array}
$$

one for each triple of tangles $T _ { Y } ^ { 0 } , T _ { Y } ^ { 1 }$ , and $T _ { Y } ^ { 2 }$ embedded in $B ^ { 3 }$ satisfying the same boundary conditions as in Definition 3.3. The fact that these diagrams commute follows from a series of topological moves that either represent gluings or equivalences between lasagna fillings.

Explicitly, let $F$ be a filling in $S ^ { 2 } ( B ^ { 3 } \times I , - T _ { Y } ^ { 0 } \cup _ { P } T _ { Y } ^ { 1 } )$ and $G$ be a filling in $S ^ { 2 } ( B ^ { 3 } \times I , - T _ { Y } ^ { 1 } \cup _ { P } T _ { Y } ^ { 2 } )$ Chasing $F \otimes G$ right first and down second through the diagram amounts to

(1) respectively identifying F and G with the fillings $F ^ { \prime }$ and $G ^ { \prime }$ that are each specified by a single, large input ball, cylinder on the boundary link, and input label; and

(2) mapping the tensor product of the labels corresponding to $F ^ { \prime }$ and $G ^ { \prime }$ to its image under the link cobordism map in Figure 1.

On the other hand, chasing down first and right second means

(1) replacing $F \otimes G$ with the union $F \cup G ,$ which is a filling in $S ^ { 2 } ( B ^ { 3 } \times I , - T _ { Y } ^ { 0 } \cup _ { P } T _ { Y } ^ { 2 } )$

(2) identifying $F \cup G$ with a third filling specified by a single, large input ball, cylinder on the boundary link, and input label; and

(3) evaluating this third filling to its label in $\mathrm { K h R } _ { 2 } ( - T _ { Y } ^ { 0 } \cup _ { P } T _ { Y } ^ { 2 } )$

Notice that the Khovanov-Rozansky map induced by the intersection of $F \cup G$ with the large input ball in the second step of the second chase is the same as the composite of two Khovanov-Rozansky maps described by the two steps in the first chase. The first step expresses the tensor product of two maps: the first is induced by the intersection of $F$ with the input ball corresponding to $F ^ { \prime }$ and the second is induced by the intersection of G with the input ball corresponding to $G ^ { \prime }$ . The second step subsequently applies vertical composition to this tensor product.

Remark 3.7. Both evaluation and vertical composition can be extended to general $H ^ { \star }$ -homology with minimal elbow grease, as both of these operations are induced by link cobordisms in $S ^ { 3 } \times I$ . Subsequently, the above example can rewritten with $H ^ { \star }$ substituted for $\mathrm { K h R _ { 2 } }$ everywhere.

Example 3.8 (The test case recovers Khovanov’s tangle invariant). We briefly elucidate how to relate Definition 3.1 to Khovanov’s tangle invariant described in [3]. We largely omit a presentation of the relevant definitions and instead refer the reader to Khovanov’s paper.

Recall that Khovanov assigns to each n-crossing diagram D of an $( m , n )$ -tangle $T$ a chain complex of $( H ^ { m } , H ^ { n } )$ -bimodules. Denote the complex by $\mathcal { F } ( D )$ and its homology by $\dot { H } ^ { \bullet } ( { \mathcal F } ( D ) )$ The complex is an invariant of T up to $( H ^ { m } , H ^ { n } )$ -chain homotopy equivalence and it splits along $B ^ { m } \times B ^ { n }$ . Likewise, the homology is an invariant of T up to $( H ^ { m } , H ^ { n } )$ -bimodule isomorphism and it splits as

$$
{ \underset { ( a , b ) \in B ^ { m } \times B ^ { n } } { \bigoplus } } ( W ( a ) D b ) .
$$

Here, $W ( a ) D b$ is the planar diagram obtained from D by composing its top boundary (of 2m points) with a 180-degree reflection of a and its bottom boundary (of 2n points) with b.

The $( H ^ { m } , H ^ { n } )$ -bimodule structure of $H ^ { \bullet } ( { \mathcal { F } } ( D ) )$ is defined similarly to the vertical composition depicted in Figure 1 after remembering that $H ^ { m }$ and $H ^ { n }$ are direct sums of Khovanov homologies. In this case, the non-cylindrical parts of the cobordisms inducing the left action of $H ^ { m }$ and the right action of $H ^ { n }$ are cobordisms between flat tangles (instead of tangles in $B ^ { 3 } )$ .


[[PAGE 5]]
Specializing to Definition 3.1, we instead let $T$ be a framed, oriented $( 0 , n )$ -tangle with a compatibly framed, oriented boundary P . We additionally assume that $T$ satisfies the same embedding and boundary conditions that are true for the triple $( B ^ { 4 } ; B ^ { 3 } ; T )$ in Example 3.5.

To each $b \in B ^ { n }$ , we associate a skein lasagna module $S ^ { 2 } ( B ^ { 4 } ; T \cup _ { P } T _ { b } )$ , where $T _ { b }$ is a choice of an embedded, compatibly framed, oriented tangle in $B ^ { 3 }$ with boundary $- P$ that is represented by the diagram b. Skein lasagna modules such as these assemble into a $k { \mathrm { - } } \left( { \mathrm { s u b } } \right)$ )module:

$$
\bigoplus _ { b \in H ^ { n } } S ^ { 2 } ( B ^ { 4 } ; T \cup _ { P } T _ { b } ) ,
$$

which admits a right action by the k-(sub)algebra:

$$
\bigoplus _ { ( a , b ) \in B ^ { n } \times B ^ { n } } S ^ { 2 } ( B ^ { 3 } \times I ; - T _ { a } \cup _ { P } T _ { b } ) .
$$

With the above presentation, the following lemma feels imminent.

Lemma 3.9. $U p$ to a sign ambiguity, there is an isomorphism of k-(sub)algebras:

$$
\bigoplus _ { ( a , b ) \in B ^ { n } \times B ^ { n } } S ^ { 2 } ( B ^ { 3 } \times I ; - T _ { a } \cup _ { P } T _ { b } ) \cong H ^ { n }
$$

and subsequently, an isomorphism of right $H ^ { n }$ -modules:

$$
\bigoplus _ { b \in H ^ { n } } S ^ { 2 } ( B ^ { 4 } ; T \cup _ { P } T _ { b } ) \cong H ^ { \bullet } ( { \mathcal { F } } ( D ) ) ,
$$

Proof. The proof is straightforward, following from a modified version of the proof of Lemma 3.6. Note that the two isomorphisms in Lemma 3.9 are specified by post-composing evaluation with the isomorphism connecting Khovanov-Rozansky ${ \mathfrak { g l } } _ { 2 } .$ -homology with Khovanov homology. This isomorphism is non-canonical with respect to link cobordisms, which explains the sign ambiguity. □

Remark 3.10. Note that if T was an $( m , 0 )$ -tangle with boundary $- P$ and we instead associated to each $a \in H ^ { m }$ a skein lasagna module $S ^ { 2 } ( B ^ { 4 } ; - T _ { a } \cup _ { P } T )$ , then such skein lasagna modules would have assembled into a left $H ^ { m }$ -module, which is isomorphic as left $H ^ { m }$ -modules to $H ^ { \bullet } ( { \mathcal { F } } ( D ) )$ (up to a sign ambiguity).

## 4. The gluing homomorphism

There is a gluing homomorphism that often appears in the minds of those topologists who study skein lasagna modules. This homomorphism was first (to the authors’ knowledge) addressed in the specific case of a boundary connected sum by Manolescu-Neithalath in [4] and later documented more generally by Ren-Wilis in [8]. It relates the skein lasagna modules associated to two 4-manifolds, which share a common, smooth, codimension zero submanifold of their boundaries, with the skein lasagna module associated to their gluing along the distinguished submanifold.

More precisely, let $( X _ { 1 } ; ( Y , \phi _ { 1 } ) ; T _ { 1 } )$ and $( X _ { 2 } ; ( - Y , \phi _ { 2 } ) ; T _ { 2 } )$ be two triples, each as in Definition 3.1. We also assume that $\phi _ { 1 }$ and ϕ2 extend to compatible framings and $\phi _ { 1 } ^ { - 1 } ( \partial T _ { 1 } ) = - \phi _ { 2 } ^ { - 1 } ( \partial T _ { 2 } )$ as compatibly framed, oriented collections of points in Y . Let $X = X _ { 1 } \cup _ { Y } X _ { 2 }$ denote the smooth gluing of the two 4-manifolds along a collar neighborhood diffeomorphic to $Y \times I$ . The gluing formula as presented in [8] is a surjective mapping:

$$
\begin{array} { r l r } & { } & { \displaystyle \bigoplus _ { T _ { Y } \subset Y } S ^ { \star } ( X _ { 1 } ; T _ { 1 } \cup _ { P } \phi _ { 1 } ( T _ { Y } ) ) \otimes S ^ { \star } ( X _ { 2 } ; - \phi _ { 2 } ( T _ { Y } ) \cup _ { P } T _ { 2 } ) \to S ^ { \star } ( X ; T _ { 1 } \cup _ { P } T _ { 2 } ) , } \\ & { } & { \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad \quad } \\ & { } & { \partial T _ { Y } = - \phi _ { 1 } ^ { - 1 } ( P ) } \\ & { } & \end{array}\tag{1}
$$

where we simultaneously identify P with $\partial T _ { 1 }$ in $X _ { 1 }$ and $- \partial T _ { 2 }$ in $X _ { 2 } . ^ { 2 }$

In this section, we give a new presentation of the quotient computed by Equation 1, which may be selfevident to the skein lasagna topologist, particularly given the exposition in Section 3. The target in Equation 1 is isomorphic to a familiar bimodule tensor product:

## Theorem 4.1.

$$
\begin{array} { r } { S ^ { \star } ( X ; T _ { 1 } \cup _ { P } T _ { 2 } ) \cong S ^ { \star } ( X _ { 1 } ; Y ; T _ { 1 } ) \bigotimes S ^ { \star } ( X _ { 2 } ; Y ; T _ { 2 } ) . } \end{array}
$$

$$
T _ { 1 } \cup _ { P \times 0 } P \times I \cup _ { P \times 1 } T _ { 2 } .
$$


[[PAGE 6]]
In the next subsection, we substantiate Theorem 4.1 with a topological proof.

4.1. Topological Picture. There is an obvious map connecting the right-hand side of the isomorphism in Theorem 4.1 to the left-hand side. This map in shorthand is $\mathrm { \bar { \Psi } g l u e ^ { \gamma } }$ In more words, we have a homomorphism:

$$
\Psi \colon S ^ { \star } ( X _ { 1 } ; Y ; T _ { 1 } ) \bigotimes _ { S ^ { \star } ( Y ; P ) } S ^ { \star } ( X _ { 2 } ; Y ; T _ { 2 } ) \to S ^ { \star } ( X ; T _ { 1 } \cup _ { P } T _ { 2 } ) ,
$$

which is described similarly to multiplication in $S ^ { * } ( Y ; P )$ . If $\Sigma _ { 1 }$ and $\Sigma _ { 2 }$ are representatives of fillings respectively in $S ^ { \star } ( X _ { 1 } ; Y ; T _ { 1 } )$ and $S ^ { \star } ( X _ { 2 } ; Y ; T _ { 2 } )$ , then the image of $\Sigma _ { 1 } \otimes \Sigma _ { 2 }$ under $\Psi$ is defined as below:

$$
\begin{array} { r } { \Psi \big ( \Sigma _ { 1 } \otimes \Sigma _ { 2 } \big ) : = \left\{ \begin{array} { l l } { \Sigma _ { 1 } \cup \Sigma _ { 2 } } & { \mathrm { i f ~ } \partial \Sigma _ { 1 } \cap Y = - \partial \Sigma _ { 2 } \cap - Y } \\ { 0 } & { \mathrm { o t h e r w i s e } . } \end{array} \right. } \end{array}
$$

Note that the bottom condition in the above assignment is slightly redundant. If the boundaries of $\Sigma _ { 1 }$ and $\Sigma _ { 2 }$ were incompatible to begin with, then $\Sigma _ { 1 } \otimes \Sigma _ { 2 }$ is already zero in the bimodule.

To convince ourselves that Ψ is an isomorphism, we construct an inverse whose operation in shorthand is $^ { 6 } \mathrm { c u t } ^ { 5 }$ . Explicitly, define

$$
\Psi ^ { - 1 } \colon S ^ { \star } ( X ; T _ { 1 } \cup _ { P } T _ { 2 } )  S ^ { \star } ( X _ { 1 } ; Y ; T _ { 1 } ) \bigotimes S ^ { \star } ( X _ { 2 } ; Y ; T _ { 2 } )
$$

to be the homomorphism specified by the following assignment on fillings. To each filling Σ in $S ^ { * } ( X ; T _ { 1 } \cup T _ { 2 } )$ apply an isotopy to its underlying surface so that

(1) the input balls of Σ are supported away from a neighborhood of Y and

(2) Σ intersects $\phi _ { i } ( Y )$ transversely in some tangle $\phi _ { i } ( T _ { Y } )$

The above rearranging ensures that Σ decomposes as

$$
\Sigma = \Sigma _ { 1 } \cup _ { \phi _ { i } ( T _ { Y } ) } \Sigma _ { 2 } ,
$$

where $\Sigma _ { 1 }$ and $\Sigma _ { 2 }$ are fillings respectively in $S ^ { \star } ( X _ { 1 } ; Y ; T _ { 1 } )$ and $S ^ { \star } ( X _ { 2 } ; Y ; T _ { 2 } )$ . Evidently, we set $\Psi ^ { - 1 } ( \Sigma )$ to be the tensor product of these fillings: $\Sigma _ { 1 } \otimes \Sigma _ { 2 }$

At first glance, it appears that the definition of $\Psi ^ { - 1 } ( \Sigma )$ depends on the choice of isotopy of Σ arranging conditions 1 and 2. The heart of proving Theorem 4.1 is rendering this choice unambiguous.

Proof of 4.1 (or that $\Psi ^ { - 1 }$ is well-defined). The fact that $\Psi ^ { - 1 }$ is independent of the choice of isotopy follows from an argument that closely resembles that for Theorem 1.4 in [4]. Nevertheless, we recount the details with minor technical updates, which are relevant for our context.

Let $\Sigma ^ { \prime }$ be a different isotopic representative of Σ satisfying conditions 1 and 2, which decomposes as

$$
\Sigma ^ { \prime } = \Sigma _ { 1 } ^ { \prime } \cup _ { \phi _ { i } ( T _ { Y } ^ { \prime } ) } \Sigma _ { 2 } ^ { \prime } .
$$

There is a one parameter family of surfaces $\{ \Sigma ( t ) \} _ { t \in [ 0 , 1 ] }$ connecting $\Sigma = \Sigma ( 0 )$ to $\Sigma ^ { \prime } = \Sigma ( 1 )$ For simplicity, we assume that this one parameter family either moves an input ball B of Σ through $\phi _ { i } ( Y )$ and keeps the rest of the skein fixed outside of this ball or fixes all of the input balls. (Any arbitrary one parameter family will be a sequence in both of these operations, up to isotopies that are supported away from a neighborhood of $\phi _ { i } ( Y ) . \ $

In the first case, we take B to be a neighborhood of a point and assume that generically B (or this point) moves from one side of $\phi _ { i } ( Y )$ to the other for a finite number of times. Let $t _ { j }$ denote one such time and $[ t _ { j } - \epsilon , t _ { j } + \epsilon ]$ denote the sub-interval on which the point intersects $\phi _ { i } ( Y )$ under the isotopy just once at $t _ { j }$ By construction, the intersections $\Sigma _ { i } ( t _ { j } - \epsilon ) \cap \phi _ { i } ( Y )$ and $\Sigma _ { i } ( t _ { j } + \epsilon ) \cap \phi _ { i } ( Y )$ are automatically transverse.

If we take ϵ to be sufficiently small, then the intersection of $\Sigma ( t _ { j } - \epsilon )$ with Y differs from the intersection of $\Sigma ( t _ { j } + \epsilon )$ with Y by replacing $\phi _ { i } ( Y )$ with a certain isotopic representative $\phi _ { i } ^ { \prime } ( Y )$ . Specifically, we require that the region between $\phi _ { i } ( Y )$ and $\phi _ { i } ^ { \prime } ( Y )$ is diffeomorphic to $Y \times I$ , and $\Sigma ( t _ { j } - \epsilon )$ intersects $\phi _ { i } ^ { \prime } ( Y )$ transversely in $\Sigma ( t _ { j } + \epsilon ) \cap \phi _ { i } ( Y )$ , and the intersection has boundary diffeomorphic to −P (as framed, oriented collections).

Altogether, we can realize $\Psi ^ { - 1 } ( \Sigma ( t _ { j } - \epsilon ) )$ by cutting $\Sigma ( t _ { j } - \epsilon )$ along $\phi _ { i } ( Y )$ and $\Psi ^ { - 1 } ( \Sigma ( t _ { j } + \epsilon ) )$ by cutting the same skein along $\phi _ { i } ^ { \prime } ( Y )$ . These cuts are further equivalent in the bimodule after intertwining the action of a filling in $S ^ { * } ( Y ; P )$ specified by cutting along both $\phi _ { i } ( Y )$ and $\phi _ { i } ^ { \prime } ( Y )$ . Hence, after proceeding inductively, we prove that $\Sigma _ { 1 } \otimes \Sigma _ { 2 }$ and $\Sigma _ { 1 } ^ { \prime } \otimes \Sigma _ { 2 } ^ { \prime }$ are equivalent in the bimodule.


[[PAGE 7]]
In the second case, we consider the intersections of $\{ \Sigma _ { t } \} _ { t \in [ 0 , 1 ] }$ with $\phi _ { i } ( Y )$ at each time t:

$$
J _ { t } = \Sigma _ { t } \cap Y ,
$$

and collect these intersections into a surface with corners:

$$
J = \bigcup _ { t \in [ 0 , 1 ] } J _ { t } \times \{ t \} \subset \phi _ { i } ( Y ) \times I .
$$

By smoothing corners, we can assume that J is a (vegetarian) filling in $S ^ { * } ( Y ; P )$

From J, we build a second surface with corners by first thickening $\phi _ { i } ( Y )$ into a “neck” or submanifold diffeomorphic to $Y \times I$ and then inserting J into this neck:

$$
\Sigma _ { J } = \Sigma ( 0 ) | _ { X _ { 1 } } \cup J \cup \Sigma ( 1 ) | _ { X _ { 2 } } .
$$

This surface can be similarly smoothed into a filling in $S ^ { * } ( X ; T _ { 1 } \cup _ { P } T _ { 2 } )$

We glean two key insights from this procedure. The first is that $\Sigma ( 0 )$ is isotopic to $\Sigma _ { J }$ through an isotopy supported in $X _ { 2 }$ and the second is that Σ(1) is also isotopic to $\Sigma _ { J }$ through an isotopy supported in $X _ { 1 }$ . The isotopy connecting Σ(0) to $\Sigma _ { J }$ at a given time t is deduced (as before) by smoothing a surface with corners:

$$
\Sigma ( 0 ) | _ { X _ { 1 } } \cup \bigcup _ { s \in [ 0 , t ] } J _ { s } \times \{ s \} \cup \Sigma ( t ) | _ { X _ { 2 } } .
$$

A similar construction describes the isotopy between $\Sigma ( 1 )$ and $\Sigma _ { J }$ . In sum, these isotopies translate to bimodule equivalences relating $\Sigma _ { 1 } \otimes \Sigma _ { 2 }$ to $\Sigma _ { 1 } \otimes J \cdot \Sigma _ { 2 } ^ { \prime }$ and $\Sigma _ { 1 } ^ { \prime } \otimes \Sigma _ { 2 } ^ { \prime }$ to $\Sigma _ { 1 } \cdot J \otimes \Sigma _ { 2 } ^ { \prime }$ The biaction further ensures a third crucial equivalence between $\Sigma _ { 1 } \otimes J \cdot \Sigma _ { 2 } ^ { \prime }$ and $\Sigma _ { 1 } \cdot J \otimes \Sigma _ { 2 } ^ { \prime } $ —ultimately settling the desired claim. □

Remark 4.2. It may be instructive for the skein lasagna topologist to convince themselves that either side of Ψ is a worthy representative for the pushout of a particular diagram of skein lasagna modules. In Figure 2, we have depicted a toy picture of this diagram.

## 5. Handle attachment formulae

In this section, we apply Theorem 4.1 to derive various handle attachment formulae for skein modules defined with a functorial link homology theory $H ^ { \star }$ of (potentially decorated) link cobordisms in $S ^ { 3 } \times I .$ At times, we may omit the boundary data from our notation for readability.

In their work on non-diffeomorphic 4-manifolds, Ren-Willis [8] showed that the Lee skein theory satisfies a very similar 2-handle formula to the Manolescu-Neithalath analogue for the Khovanov skein theory [4] and Chen showed that link Floer homology also satisfies a similar formula for 2-handle attachments [2]. The general formula we provide for 2-handle attachments provides some additional clarity as to why these three previously known 2-handle formula share similarities.

For completeness we remark briefly on 4-handles even though a topological general position argument easily shows that the addition of a 4-handle does not change a skein module [4]. Let X be the result of attaching a 4-handle to $X _ { 1 }$ and take Y to be the attaching region $S ^ { 3 }$ . Here also $X _ { 2 } = B ^ { 4 }$ and both the skein modules $S ^ { \star } ( X _ { 1 } )$ and $S ^ { \star } ( X _ { 2 } )$ become modules over $S ^ { \star } ( S ^ { 3 } \times I )$ For co-dimension reasons we know that both L and any filling don’t intersect the 4-handle so the relevant skein modules are $S ^ { \star } ( X _ { 1 } , L )$ and $S ^ { \star } ( B ^ { 4 } , \varnothing ) \cong k$ . Additionally we know that the action of $S ^ { \star } ( S ^ { 3 } \times I , \emptyset )$ on $S ^ { \star } ( X _ { 1 } , L )$ is exactly the kmodule structure on $S ^ { \star } ( X _ { 1 } , L )$ . Putting this together then the identification of $S ^ { \star } ( X , L )$ with the quotient of $S ^ { \star } ( X _ { 1 } , L ) \otimes S ^ { \star } ( B ^ { 4 } , \emptyset )$ by the identification of the module actions recovers the previously known isomorphism $S ^ { \star } ( X , L ) \cong S ^ { \star } ( X _ { 1 } , L )$

Example 5.1 (1-handle attachment). Let X be the result of attaching a 1-handle to $X _ { 1 }$ and take $Y$ to be the attaching region $S ^ { 0 } \times B ^ { 3 } = - B ^ { 3 } \sqcup B ^ { 3 }$ . So $X _ { 2 } = B ^ { 1 } \times B ^ { 3 } \cong B ^ { 4 }$ . We will compute $S ^ { \star } ( X ; L )$

By a general position argument, we can assume that L intersects $X _ { 1 }$ in a compatibly framed, oriented tangle $T$ and $X _ { 2 }$ in $P \times I .$ , which is interpreted as a compatibly framed, oriented collection of core-parallel arcs. Note that both $S ^ { * } ( X _ { 1 } ; - B ^ { 3 } \sqcup B ^ { 3 } ; T )$ and $S ^ { * } ( X _ { 2 } ; - B ^ { \bar { 3 } } \sqcup B ^ { \bar { 3 } } ; P \times I )$ become modules over $S ^ { \star } ( - B ^ { 3 } \sqcup B ^ { 3 } ; P )$ ， which is isomorphic as a k-algebra to $S ^ { * } ( B ^ { 3 } ; P ) ^ { \mathrm { o p } } \times S ^ { * } ( B ^ { 3 } ; P )$

<!-- image-->  

[[PAGE 8]]
Figure 2. A pushout diagram of gluing homomorphisms.

Alternatively, this can be thought of as each having two distinct module structures over $S ^ { \star } ( B ^ { 3 } )$ : one for each of the attaching 3-ball regions. $\mathrm { S o } , S ^ { \star } ( X _ { 1 } )$ becomes both a right and left $S ^ { \star } ( B ^ { 3 } )$ )-module and similarly for $S ^ { \star } ( X _ { 2 } )$ . The left and right actions commute with one another other on both $S ^ { \star } ( X _ { 1 } )$ and $S ^ { \star } ( X _ { 2 } )$

Theorem 4.1 tells us that $S ^ { \star } ( X ; L )$ is obtained from $S ^ { * } ( X _ { 1 } ) \otimes _ { k } S ^ { * } ( X _ { 2 } )$ by setting the left action on $S ^ { * } ( X _ { 1 } )$ equal to the right action on $S ^ { * } ( X _ { 2 } )$ and the right action on $S ^ { * } ( X _ { 2 } )$ equal to the left action on $S ^ { * } ( X _ { 1 } )$ . We can simplify this picture by recalling that we have an identification between $S ^ { * } ( X _ { 2 } )$ and $S ^ { * } ( B ^ { 4 } )$

Recalling this identification, given a filling $\Sigma _ { 1 } \otimes \Sigma _ { 2 }$ in $S ^ { \star } ( X , L )$ , we can instead represent it as $S _ { 1 } \cdot \Sigma _ { 1 } \cdot S _ { 2 }$ for any choice fillings $S _ { 1 } , S _ { 2 }$ with $S _ { 2 } \cdot S _ { 1 } = \Sigma _ { 2 }$ . This insight tells us that in fact we have a surjective map

$$
f : \oplus _ { T _ { i } } S ^ { * } \left( X _ { 1 } , T \cup ( T _ { i } \sqcup - T _ { i } ) \right) \to S ^ { \star } ( X , L ) ,
$$

and the kernel is generated by the identification of the various fillings $S _ { 1 } \cdot \Sigma _ { 1 } \cdot S _ { 2 }$ for different factorizations of $S _ { 2 } \cdot S _ { 1 } = \Sigma _ { 2 }$ . If we restrict to Khovanov-Rozansky ${ \mathfrak { g l } } _ { n }$ -homology this exactly recovers 1-handle formula of Manolescu-Walker-Wedrich [5, Theorem 4.7].


[[PAGE 9]]
Example 5.2 (2-handle attachment). Let X be the result of attaching a 2-handle to $X _ { 1 }$ and take $Y$ to be the attaching region $S ^ { 1 } \times B ^ { 2 }$ . Here also $X _ { 2 } = B ^ { 2 } \times B ^ { 2 } \cong B ^ { 4 }$ and both the skein modules $S ^ { \star } ( X _ { 1 } )$ and $S ^ { \star } ( X _ { 2 } )$ become modules over $S ^ { \star } ( S ^ { 1 } \times B ^ { 2 } )$ . Using general position arguments, will may assume that L is disjoint from the attaching region Y . Our tensor factors are initially

$$
\mathcal { X } _ { 1 } = S ^ { \star } ( X _ { 1 } , Y , L ) ; \quad \mathcal { X } _ { 2 } = S ^ { \star } ( X _ { 2 } , \emptyset ) ; \quad \mathcal { Y } = S ^ { \star } ( Y , \emptyset ) .
$$

However we will first work to understand a smaller tensor product, which admits an obvious map into $\mathcal { X } _ { 1 } \otimes _ { \mathcal { Y } } \mathcal { X } _ { 2 }$ We first describe a subalgebra $\mathcal { V } ^ { \prime }$ of Y: We will consider fillings of $S ^ { 1 } \times B ^ { 2 } \times I$ generated by fillings $S ^ { 1 } \times T$ where $T$ where $T$ is either a crossingless $( n , n + 2 )$ tangle, with n sheets between the two sides and a single semicircle between the two ends on the $n { \mathrel { + { 2 } } }$ side or its reverse, an $( n + 2 , n )$ -tangle. Additionally, we allow decorations on the sheet $S ^ { 1 } \times T$ as determined by the functorial link theory $H ^ { \star }$ . Finally, we allow fillings $S ^ { 1 } \times B$ for braids B. Call this algebra $\mathcal { V } ^ { \prime }$ . There are right- and $\mathrm { l e f t - } \mathcal { V } ^ { \prime }$ submodules of $\mathcal { X } _ { 1 }$ and $\lambda _ { 2 } ;$

$$
\chi _ { 1 } ^ { \prime } = \bigoplus S ^ { \star } ( X _ { 1 } , L \cup K _ { n _ { + } , n } ) ; \quad \chi _ { 2 } ^ { \prime } = \bigoplus S ^ { \star } ( X _ { 2 } , U _ { n _ { + } , n _ { - } } ) .
$$

Note there is a map $\chi _ { 1 } ^ { \prime } \otimes y ^ { \prime } \chi _ { 2 } ^ { \prime }  \chi _ { 1 } \otimes y \chi _ { 2 } \cong S ^ { \star } ( X , L )$

Now there is a also map $\mathcal { X } _ { 1 } ^ { \prime }  \mathcal { X } _ { 1 } ^ { \prime } \otimes _ { Y ^ { \prime } } \mathcal { X } _ { 2 } ^ { \prime }$ which simply tensors lasagna fillings v in $X _ { 1 }$ with correctly oriented cocore-transverse disks $d ( v )$ in $X _ { 2 }$ . Take v in $\mathcal { X } _ { 1 } ^ { \prime } .$ , and let $a \in \mathcal { V } ^ { \prime }$ be a (possibly decorated) $( n , n + 2 )$ - sheet. Then in our bimodule tensor product we identify a simple tensor $v . a \otimes d ( v . a )$ with $v \otimes a . d ( v )$ But $a . d ( v )$ is the skein element $v \sqcup S$ where $S$ is a possibly decorated sphere; the specifics of $H ^ { \star }$ determine an evaluation of these potentially decorated) spheres. Similarly if a is a braided sheet then the action of a on $d ( v )$ is trivial. These two facts show that our map $\mathcal { X } _ { 1 } ^ { \prime }  \mathcal { X } _ { 1 } ^ { \prime } \otimes _ { Y } ^ { \prime } \mathcal { X } _ { 2 } ^ { \prime }$ descends to a map on $\mathcal { X } _ { 1 } ^ { \prime } / \sim ,$ where ∼ is the quotient by the braiding relations along with the relations induced by consideration of (potentially decorated) spheres.

In total we now have a map

$$
{ \frac { \oplus S ^ { \star } ( X _ { 1 } , L \cup K _ { n _ { + } , n _ { - } } ) } { \sim } } \to S ^ { \star } ( X , L ) .
$$

The proof that this map is an isomorphism follows the same steps as the similar argument in [4] so details are omitted. Showing that the map is surjective can be done via general position arguments on fillings of $( X , L )$ with respect to the co-core of the 2-handle to describe a filling of $( X _ { 1 } , L \cup K _ { n _ { + } , n _ { - } } )$ after cutting along the 2-handle. The argument for injectivity follows from considering how two different choices of an isotopy of a filling to realize transverseness to the co-core might differ in a neighborhood of the co-core.

In the case that we restrict to Khovanov-Rozansky ${ \mathfrak { g l } } _ { n }$ -homology we have exactly recovered the 2-handle formula of Manolescu-Neithalath [4]. Restricting to link Floer homology and Lee homology recover the 2-handle formula of Chen and Ren-Willis respectively [2, 8].

Example 5.3 (3-handle attachment). Finally, we consider the case of 3-handle attachments. Let X be the result of attaching a 3-handle to $X _ { 1 }$ and take $Y$ to be the attaching region $S ^ { 2 } \times B ^ { 1 }$ . Here also $X _ { 2 } =$ $B ^ { 3 } \times B ^ { 1 } \cong B ^ { 4 }$ . Define skein lasagna submodules and sub-algebra

$$
\chi _ { 1 } = { S } ^ { \star } ( X _ { 1 } , L ) ; \quad \chi _ { 2 } = { S } ^ { \star } ( X _ { 2 } , \emptyset ) ; \quad \mathcal { V } = { S } ^ { \star } ( { S } ^ { 2 } \times { B } ^ { 2 } , \emptyset ) .
$$

A standard general position argument allows us to refine Theorem 4.1 in this instance to say

$$
S ^ { \star } ( X ) \cong \mathcal { X } _ { 1 } \otimes _ { \mathcal { Y } } \mathcal { X } _ { 2 } .
$$

Since $\mathcal { X } _ { 2 } \cong k$ we we learn that

$$
S ^ { \star } ( X ) \cong \frac { \mathcal { X } _ { 1 } } { \sim }
$$

where the relation ∼ is given from the right action of $S ^ { \star } ( S ^ { 2 } \times B ^ { 2 } )$ on $\mathcal { X } _ { 1 } ^ { \prime }$ being set equal to the left action on $S ^ { \star } ( B ^ { 4 } ) = k$ . In the case that we restrict to Khovanov-Rozansky ${ \mathfrak { g l } } _ { n }$ -homology and use a computation of $S ^ { n } ( S ^ { 2 } \times { \dot { B } } ^ { 2 } )$ we have exactly recovered the 3-handle formula of Manolescu-Walker-Wedrich [5, Remark 3.9].

## References

[1] Sarah Blackwell, Vyacheslav Krushkal, and Yangxiao Luo. Cornered Skein Lasagna Theory. December 2025. arXiv:2512.05861 [math].

[2] Daren Chen. Floer Lasagna Modules From Link Floer Homology. March 2022. arXiv:2203.07650 [math].

[3] Mikhail Khovanov. A functor-valued invariant of tangles. Algebraic & Geometric Topology, 2(2):665–741, September 2002. Publisher: Mathematical Sciences Publishers.


[[PAGE 10]]
[4] Ciprian Manolescu and Ikshu Neithalath. Skein Lasagna Modules for 2-handlebodies. Journal f¨ur die reine und angewandte Mathematik (Crelles Journal), 2022(788):37–76, July 2022. Publisher: De Gruyter Section: Journal f¨ur die reine und angewandte Mathematik.

[5] Ciprian Manolescu, Kevin Walker, and Paul Wedrich. Skein Lasagna Modules and Handle Decompositions. Advances in Mathematics, 425:109071, 2023. Publisher: Elsevier.

[6] Kim Morrison, Kevin Walker, and Paul Wedrich. Invariants of 4-manifolds from Khovanov-Rozansky Link Homology. Geom. Topol, 26(8):3367–3420, 2022.

[7] Qiuyu Ren, Ian Sullivan, Paul Wedrich, Michael Willis, and Melissa Zhang. Khovanov Skein Lasagna modules with 1- dimensional Inputs. October 2025. arXiv:2510.05273 [math].

[8] Qiuyu Ren and Michael Willis. Khovanov Homology and Exotic 4-manifolds. December 2025. arXiv:2402.10452 [math].

[10] Ian A. Sullivan and Melissa Zhang. Kirby Belts, Categorified Projectors, and the Skein Lasagna Module of $S ^ { 2 } \times S ^ { 2 }$ November 2024. arXiv:2402.01081 [math].

[9] Ian A. Sullivan. Bar-Natan Skein Lasagna Modules and Exotic Surfaces in 4-manifolds. May 2025. arXiv:2504.03968 [math].