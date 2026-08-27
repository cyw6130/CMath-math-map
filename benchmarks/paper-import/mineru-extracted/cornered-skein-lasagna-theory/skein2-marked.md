[[PAGE 1]]
# CORNERED SKEIN LASAGNA THEORY

[[PAGE 2]]
SARAH BLACKWELL, VYACHESLAV KRUSHKAL, AND YANGXIAO LUO

Abstract. We extend the skein lasagna theory of Morrison–Walker–Wedrich to 4-manifolds with corners and formulate gluing formulas for 4-manifolds with boundary and, more generally, with corners. As an application, we develop a categorical framework for a presentation of the skein lasagna module of trisected closed 4-manifolds. Further, we extend the theory to dimension two by introducing bicategories for closed oriented surfaces and proving a gluing formula for the categories associated with 3-manifolds with boundary.

## 1. Introduction

The skein lasagna module $S ^ { N } ( X , L )$ is an invariant of a smooth 4-manifold with a framed link L in its boundary, introduced by Morrison, Walker and Wedrich [MWW22]. It takes as input the ${ \mathfrak { g l } } _ { N }$ Khovanov-Rozansky homology [KR08] of links in the 3-sphere and provides a universal extension to 4-manifolds using embedded surfaces in X with boundary equal to L and a collection of links in the boundary of a finite family of 4-balls removed from the interior of X; see Section 2 for more details. The skein lasagna module has a bigrading induced from the Khovanov-Rozansky homology, and it may be considered as the degree zero part of blob homology theory of Morrison-Walker [MW12]. Fixing N throughout, we abbreviate $S ^ { N } ( X , L )$ as S(X, L).

Direct calculation of the skein lasagna module from its definition appears feasible only in the simplest cases: the 4-sphere or the 4-ball with a link L in its boundary. The theory in these cases recovers the ground ring for $S ^ { 4 }$ , and the Khovanov-Rozansky homology for $( D ^ { 4 } , L )$ . A method for computing the lasagna module for 4-manifolds built without 1- or 3-handles was introduced by Manolescu-Neithalath [MN22]. In this case it reformulates $S ( X )$ using the cabled Khovanov-Rozansky homology for the attaching link of the 2-handles in $S ^ { 3 }$ a more concrete invariant, but still very challenging to compute. Additional methods that incorporate 1- and 3-handles were developed by Manolescu-Walker-Wedrich [MWW23]. It was shown by Sullivan-Zhang [SZ24] and by Ren-Willis [RW24] that $S ( S ^ { 2 } \times { \bar { S ^ { 2 } } } )$ is trivial. Further vanishing results for 4-dimensional 2-handlebodies were established in [RW24] under certain assumptions on the framing of the 2-handles.

In a major contribution, Ren and Willis [RW24] showed that the skein lasagna module is a powerful 4-manifold invariant, distinguishing an exotic pair of compact smooth 4-manifolds. It is therefore desirable to develop new methods of computing the invariant. The aim of this paper is to develop a TQFT framework for studying the skein lasagna module using cut-and-paste methods.

In more detail, let X be a 4-manifold with corners with $\partial X \cong ( - Y _ { 1 } ) \cup _ { \Sigma } Y _ { 2 }$ , where $Y _ { 1 } , Y _ { 2 }$ are 3-manifolds with common boundary equal to a closed surface Σ. The invariant of X, with a specified finite collection of points $P \subset \Sigma$ , takes the form of a bifunctor

$$
F _ { X , P } \colon S ( Y _ { 1 } , P ) \times S ( Y _ { 2 } , P ) ^ { o p } \to \mathcal { V }
$$

defined on certain categories associated with $Y _ { 1 } , Y _ { 2 }$ and valued in the category V of $\mathbb { Z } ^ { 2 } .$ -graded Z-modules; see Section 3.

Given two such manifolds $X _ { 1 } , X _ { 2 }$ with $\partial X _ { 1 } \cong ( - Y _ { 1 } ) \cup _ { \Sigma } Y _ { 2 }$ and $\partial X _ { 2 } \cong ( - Y _ { 2 } ) \cup _ { \Sigma } Y _ { 3 }$ we formulate a suitable version of the tensor product of their bifunctors $F _ { X _ { 1 } , P } , F _ { X _ { 2 } , P }$ . The following theorem (Theorem 3.8 in Section 3) states our first gluing result.

Theorem. In the notation as above,

$$
F _ { X _ { 1 } , P } \otimes _ { S ( Y _ { 2 } , P ) } F _ { X _ { 2 } , P } \cong F _ { X _ { 1 } \cup _ { Y _ { 2 } } X _ { 2 } , P }\tag{1.1}
$$

as $(  { \boldsymbol { S } } ( Y _ { 1 } ,  { \boldsymbol { P } } ) ,  { \boldsymbol { S } } ( Y _ { 3 } ,  { \boldsymbol { P } } ) )$ -bimodules.

As a special case, this result applies to gluing 4-manifolds with boundary (without corners) as well. A version of Equation 1.1 is also established for self-gluing, where a 4-manifold X has boundary of the form $( - Y ) \cup _ { \Sigma } Y$ and the two copies of Y are identified.

In addition to setting up a TQFT framework, our work was motivated by the goal of developing a new computational method of the skein lasagna module of trisected 4-manifolds. In this case a closed 4-manifold is given as the union of three cornered 4-manifolds which are 4-dimensional 1-handlebodies $\mathsf { \Omega } ^ { \star } ( S ^ { 1 } \times B ^ { 3 } )$ , subject to certain additional conditions; see Section 3.3 for a more detailed discussion. The following statement summarizes in general terms our presentation of the skein lasagna module for a given trisection $X = X _ { 1 } \cup X _ { 2 } \cup X _ { 3 } { \mathrm { { : } } }$ more precise theorems are given in Section 3.

Framework for computing $S ( X )$ for trisections. For a closed trisected 4-manifold X its skein lasagna module $S ( X )$ can be assembled from the cornered invariants of the 1-handlebodies $X _ { i }$ using our gluing formulas, together with a stabilization equivalence relation on marked points $P \subset \Sigma$ in the central surface.

In principle, this reduces the problem of computing the invariant of X to understanding the cornered invariant of the standard pieces (4-dimensional 1-handlebodies $X _ { i } )$ and how they interact under gluing. However, it was shown in [MWW23] that $S ( S ^ { 1 } \times B ^ { 3 } , L )$ is locally infinitely generated (i.e. infinitely generated in a particular bidegree) for some links $L \subset \mathcal { \# } ^ { k } ( S ^ { 1 } \times \bar { S } ^ { 2 } )$ , so using gluing results such as Equation 1.1 in this case is likely to be highly non-trivial. Using this approach to calculations of the skein lasagna module of a trisected 4-manifold with $k = 0$ (and $\mathrm { g e n u s } ( \Sigma ) \geq 1 )$ is more feasible.

We extend the theory down to dimension two in Section 4, defining bicategories for closed orientable surfaces. A compact oriented 3-manifold Y with $\partial Y = \Sigma$ gives rise to a module over the bicategory associated with Σ, and it is shown in Theorem 4.7 that the invariant of a closed 3-manifold $Y _ { 1 } \cup _ { \Sigma } Y _ { 2 }$ is isomorphic to a suitably defined tensor product of the modules assigned to $Y _ { 1 }$ and $Y _ { 2 }$

Remark 1.2. A cornered version of Heegaard Floer homology was developed in [DM14; DLM19]. We note the difference in dimensions between our setting and the work in these references. Our top-dimensional gluing result applies to cornered 4-manifolds, and we extend the theory down to dimension two. The gluing results in [DLM19] concern 3-manifolds with codimension-2 corners, and the theory is extended to 1-manifolds.

Acknowledgments. Our approach was strongly influenced by the ideas and TQFT methods developed in [Wal06] and [Fre+08].

We are grateful to Paul Wedrich for numerous conversations and for generously sharing his insight into the subject. We also would like to thank Chris Douglas, Robert Lipshitz, and Mike Willis for helpful conversations.

[[PAGE 3]]
SB was supported by the NSF Postdoctoral Research Fellowship DMS-2303143. VK was supported in part by NSF Grant DMS-2405044.

## 2. Background and definitions

In this paper we work in the smooth category. Let Σ be a fixed closed, oriented surface of genus ${ \mathit { g } } ,$ and let I denote the unit interval which is taken to be [−1, 1]. We assume tangles are framed and properly embedded.

We first recall the relevant terminology from skein lasagna theory [MW12; MWW22]. Let $Z$ be a functorial link invariant in $\mathbb { R } ^ { 3 }$ satisfying the conditions in [MWW24, Theorem 2.1].

Definition 2.1 ([MWW22]). Given an oriented 4-manifold X with an oriented framed link $L \subset \partial X$ , a lasagna filling F of $( X , L )$ consists of $( S , \{ ( B _ { i } , L _ { i } , v _ { i } ) \} )$ , where

$\{ B _ { i } \}$ is a finite collection of disjoint 4-balls embedded in the interior of $X$ , called input balls,

$L _ { i }$ is an oriented framed link in $\partial B _ { i }$

$v _ { i }$ is an element in $Z ( L _ { i } )$ , sometimes called a homogeneous label, and

$S$ is an oriented framed surface properly embedded in $X \backslash \cup _ { i } B _ { i }$ , such that $S \cap \partial X = L$ and $S \cap \partial B _ { i } = L _ { i }$ for each i.

Definition 2.2 ([MWW22]). Given an oriented 4-manifold X with an oriented framed link $L \subset \partial X$ , its skein lasagna module $S ( X , L )$ is the R-module generated by the lasagna fillings of $( X , L )$ , modulo the transitive and linear closure of the following relation.

- Linear combinations of lasagna fillings are set to be multilinear in the labels $v _ { i }$

- Two lasagna fillings $F _ { 1 }$ and $F _ { 2 }$ are set to be equivalent if $F _ { 1 }$ has an input ball $B _ { 1 }$ with label $v _ { 1 }$ , and $F _ { 2 }$ F is obtained from $F _ { 1 }$ by replacing $B _ { 1 }$ with a lasagna filling $F _ { 3 } = ( S ^ { \prime } , \{ ( B _ { j } , L _ { j } , v _ { j } ) \} )$ of $( B _ { 1 } , L _ { 1 } )$ , such that $v _ { 1 } = Z ( S ^ { \prime } ) ( \otimes _ { i } v _ { j } )$ , followed by an isotopy rel. boundary. A depiction of this relation can be found in [MWW22, Section 2.2].

Throughout this paper, we will assume that the TQFT Z is the Khovanov-Rozansky ${ \mathfrak { g l } } _ { N }$ homology $K h R _ { N }$ , which takes values in Z2-graded Z-modules. The bidegree of a lasagna filling $F = ( S , \{ ( B _ { i } , L _ { i } , v _ { i } ) \} )$ is given by

$$
\deg ( F ) = \sum _ { i } \deg ( v _ { i } ) + ( 0 , ( 1 - N ) \chi ( S ) ) \in \mathbb { Z } ^ { 2 } .
$$

Then the skein lasagna module $S ( X , L )$ inherits a $\mathbb { Z } ^ { 2 } .$ -grading.

We now set up the categorical framework which we will use throughout the rest of the paper. Our work relies on TQFT methods (which apply in much greater generality) developed in [Wal06; Fre+08]. First we discuss a relatively simple gluing map that will be useful for the definition of this category. Let $X _ { 1 } , X _ { 2 }$ be oriented 4-manifolds and $L _ { 1 } , L _ { 2 }$ be framed oriented links in the boundary of $X _ { 1 } , X _ { 2 }$ respectively. Let Y be a 3-manifold with boundary, with $Y \hookrightarrow \partial X _ { 1 }$ and $- Y \hookrightarrow \partial X _ { 2 }$ , such that ∂Y has transverse intersections with $L _ { 1 }$ and $L _ { 2 }$ . Then ∂Y cuts $L _ { 1 }$ into two tangles $T _ { 2 } = L _ { 1 } \cap Y$ and $- T _ { 1 } = L _ { 1 } \cap ( \partial X _ { 1 } \setminus Y )$ , and cuts $L _ { 2 }$ into two tangles $- T _ { 2 } ^ { \prime } = L _ { 2 } \cap Y$ and $T _ { 3 } = L _ { 2 } \cap ( \partial X _ { 2 } \setminus Y )$

[[PAGE 4]]
Suppose that $T _ { 2 } ^ { \prime } = T _ { 2 }$ . Then we can glue $( X _ { 1 } , - T _ { 1 } \cup T _ { 2 } )$ and $( X _ { 2 } , - T _ { 2 } \cup T _ { 3 } )$ together along $( Y , T _ { 2 } )$ to obtain $( X _ { 1 } \cup X _ { 2 } , - T _ { 1 } \cup T _ { 3 } )$ . A lasagna filling of $( X _ { 1 } , - T _ { 1 } \cup T _ { 2 } )$ and a lasagna filling of $( X _ { 2 } , - T _ { 2 } \cup T _ { 3 } )$ glue to create a lasagna filling of $( X _ { 1 } \cup X _ { 2 } , - T _ { 1 } \cup T _ { 3 } )$ in a bilinear way, inducing a map

$$
\operatorname { g l u e } _ { T _ { 2 } } \colon S ( X _ { 1 } , - T _ { 1 } \cup T _ { 2 } ) \otimes _ { \mathbb { Z } } S ( X _ { 2 } , - T _ { 2 } \cup T _ { 3 } ) \to S ( X _ { 1 } \cup X _ { 2 } , - T _ { 1 } \cup T _ { 3 } ) .\tag{2.3}
$$

We are now in a position to define categories associated with 3-manifolds. The following definition was introduced and studied in [MWW23, Definition 4.5] in the case when the 3-manifold is the 3-ball. Let Y be an oriented, compact 3-manifold with boundary, and let $\iota \colon \Sigma  \partial Y$ be a (not necessarily orientation-preserving) diffeomorphism.

Definition 2.4. To the 3-manifold Y and a finite collection of framed points $P \subset \Sigma$ we associate the 3-manifold category $S ( \boldsymbol { Y } , \boldsymbol { P } )$ defined as follows.

- The objects of $S ( \boldsymbol { Y } , \boldsymbol { P } )$ are oriented framed tangles $T$ properly embedded in $Y$ such that $\partial T = \iota ( P )$

- Given two tangles $T , T ^ { \prime }$ , let L denote the oriented framed link

$$
\left( - T ^ { \prime } \times \{ - 1 \} \right) \cup \left( \iota ( P ) \times I \right) \cup \left( T \times \{ 1 \} \right)
$$

in the boundary of $Y \times I$ , as shown in Figure 1. Then the morphism set between the tangles $T , T ^ { \prime }$ is the Z2-graded Z-module

$$
{ \mathrm { H o m } } _ { { \cal S } ( Y , P ) } ( T , T ^ { \prime } ) = { \cal S } ( Y \times I , L ) .
$$

Composition is modeled on stacking lasagna fillings along the interval factor and is implemented by the gluing map in Equation 2.3. Note that when Y is a closed 3-manifold, we must have an empty point set on the boundary. We will denote ${ \mathcal { S } } ( Y , \emptyset )$ simply as $S ( Y )$

<!-- image-->  
Figure 1. The 4-manifold $Y \times I$ with the link $L = ( - T ^ { \prime } \times \{ - 1 \} ) \cup ( P \times I ) \cup$ $( T \times \{ 1 \} )$ on its boundary.

Remark 2.5. Finite subsets $P \subset \Sigma$ and tangles $T \subset Y$ are considered as submanifolds, as opposed to equivalence classes up to isotopy.

Remark 2.6. If the diffeomorphism $\iota \colon \Sigma \  \ \partial Y$ has no ambiguity in context, we will identify Σ and $\partial Y$ , and write $\partial Y = \Sigma { \mathrm { ~ i f ~ } } \iota$ is orientation-preserving, write $\partial Y = - \Sigma$ if ι is orientation-reversing.

## 3. The invariant of cornered 4-manifolds and gluing formulas

In this section we define the invariant of cornered 4-manifolds and present our gluing theorems. The reader may consult [Wal16, Section 1.5] for the definition and basic properties of manifolds with corners. In Section 3.1 we consider the case of gluing two distinct, possibly cornered, oriented 4-manifolds together. Then, motivated by the theory of trisections, in Section 3.2 we consider what happens when we glue a 4-manifold to itself in a prescribed way. In Section 3.3, we discuss an application of our results to the theory of trisections.

[[PAGE 5]]
We construct an invariant of oriented, compact 4-manifolds X with corners, $\partial X = \left( - Y _ { 1 } \right) \cup _ { \Sigma }$ $Y _ { 2 }$ , where $Y _ { 1 }$ and $Y _ { 2 }$ are two oriented, compact 3-manifolds with $\partial Y _ { 1 } = \partial Y _ { 2 } = \Sigma$ (note that we allow the possibility of $\Sigma$ to be empty, giving the case $\partial X = ( - Y _ { 1 } ) \sqcup Y _ { 2 } )$ . Suppose that X is equipped with an orientation-preserving diffeomorphism $\phi \colon ( - Y _ { 1 } ) \cup _ { \Sigma } Y _ { 2 } \to \partial X$ If we fix a point set $P \subset \Sigma$ , then we obtain two categories $S ( Y _ { 1 } , P )$ and $S ( Y _ { 2 } , P )$ by Definition 2.4.

Definition 3.1. To the 4-manifold X with boundary as described above, we associate the cornered skein lasagna bimodule, which is a bifunctor

$$
F _ { X , P } \colon S ( Y _ { 1 } , P ) \times S ( Y _ { 2 } , P ) ^ { o p } \to \mathcal { V } ,
$$

where V is the category of $\mathbb { Z } ^ { 2 }$ -graded Z-modules. For a pair of tangles $T _ { 1 } \in \mathrm { O b j } ( S ( Y _ { 1 } , P ) )$ and $T _ { 2 } \in \mathrm { O b j } ( S ( Y _ { 2 } , P ) )$ , we define

$$
F _ { X , P } ( T _ { 1 } , T _ { 2 } ) = S ( X , \phi ( - T _ { 1 } \cup T _ { 2 } ) ) ,\tag{3.2}
$$

where $\phi ( - T _ { 1 } \cup T _ { 2 } )$ is a link in $\partial X$ , as shown in Figure 2. For a pair of lasagna fillings $\alpha _ { 1 } \in \mathrm { H o m } _ { S ( Y _ { 1 } , P ) } ( T _ { 1 } , T _ { 1 } ^ { \prime } )$ and $\alpha _ { 2 } \in \mathrm { H o m } _ { S ( Y _ { 2 } , P ) ^ { o p } } ( T _ { 2 } , T _ { 2 } ^ { \prime } )$ , we define $F _ { X , P } ( \alpha _ { 1 } , \alpha _ { 2 } )$ to be the linear map induced by concatenating with $( \phi \times I ) ( \alpha _ { 1 } \cup \alpha _ { 2 } )$ . This definition extends bilinearly to linear combinations of lasagna fillings.

<!-- image-->  
Figure 2. The 4-manifold X with the link $- T _ { 1 } \cup T _ { 2 }$ on its boundary.

Sometimes we will refer to the bifunctor $F _ { X , P }$ as a $( S ( Y _ { 1 } , P ) , S ( Y _ { 2 } , P ) )$ )-bimodule.

Remark 3.3. If the diffeomorphism $\phi \colon ( - Y _ { 1 } ) \cup _ { \Sigma } Y _ { 2 } \to \partial X$ has no ambiguity in context, we will identify $( - Y _ { 1 } ) \cup _ { \Sigma } Y _ { 2 }$ and $\partial X$ , and write $\partial X = ( - Y _ { 1 } ) \cup _ { \Sigma } Y _ { 2 }$

Remark 3.4. Let $\alpha \in \mathrm { H o m } _ { \mathcal { S } ( Y _ { 1 } , P ) } ( T _ { 1 } , T _ { 1 } ^ { \prime } )$ and $\gamma \in { \mathrm { H o m } } _ { S ( Y _ { 2 } , P ) ^ { o p } } ( T _ { 2 } , T _ { 2 } ^ { \prime } )$ . For the linear map $F _ { X , P } ( \alpha , \gamma ) \colon S ( X , \phi ( - T _ { 1 } \cup T _ { 2 } ) ) \to S ( X , \phi ( - T _ { 1 } ^ { \prime } \cup T _ { 2 } ^ { \prime } ) )$ and an element $b \in \mathcal { S } ( X , \phi ( - T _ { 1 } \cup T _ { 2 } ) )$ , we will abuse notation and simply denote $( F _ { X , P } ( \alpha , \gamma ) ) ( b )$ as $\alpha \cdot b \cdot \gamma$ . Furthermore, we will denote $\mathrm { i d } _ { T _ { 1 } } \cdot b \cdot \gamma$ as $b \cdot \gamma ,$ , and $\alpha \cdot b \cdot \mathrm { i d } _ { T _ { 2 } }$ as $\alpha \cdot b$

3.1. Gluing two pieces. Our goal now is to describe how the cornered skein lasagna bimodule behaves under gluing. Let $Y _ { 1 } , Y _ { 2 } , Y _ { 3 }$ be three oriented compact 3-manifolds with $\partial Y _ { 1 } = \partial Y _ { 2 } = \partial Y _ { 3 } = \Sigma$ Suppose that $X _ { 1 } , X _ { 2 }$ are oriented compact 4-manifolds with $\partial X _ { 1 } = ( - Y _ { 1 } ) \cup _ { \Sigma } Y _ { 2 }$ and $\partial X _ { 2 } = ( - Y _ { 2 } ) \cup _ { \Sigma } Y _ { 3 }$ . We will glue two such 4-manifolds along $Y _ { 2 }$ to get $X _ { 1 } \cup _ { Y _ { 2 } } X _ { 2 }$ , as depicted in Figure 3. Given two bimodules $F _ { X _ { 1 } , P } \colon S ( Y _ { 1 } , P ) \times S ( Y _ { 2 } , P ) ^ { o p } \to \mathcal { V }$ and $F _ { X _ { 2 } , P } \colon S ( Y _ { 2 } , P ) \times S ( Y _ { 3 } , P ) ^ { o p } \to \mathcal { V }$ , we wish to define a tensor product between $F _ { X _ { 1 } , P }$ and $F _ { X _ { 2 } , P }$ to recover the bimodule $F _ { X _ { 1 } \cup _ { Y _ { 2 } } X _ { 2 } , P } .$

[[PAGE 6]]
<!-- image-->  
Figure 3. Two schematics for gluing two cornered 4-manifolds along part of their boundary. The left hand side is useful for a big picture view of what pieces are being glued, while the right hand side (in which all pieces have increased in dimension) is useful for seeing where the points, tangles, and surfaces (which will be relevant in Definition 3.1) live. Here, the gray schematically represents lasagna fillings of $( X _ { 1 } , T ^ { \prime } \cup T ^ { \prime \prime } )$ and $( X _ { 2 } , T ^ { \prime \prime } \cup T ^ { \prime \prime \prime } )$

Fix an object $T ^ { \prime }$ in $S ( Y _ { 1 } , P )$ and an object $T ^ { \prime \prime \prime }$ in $S ( Y _ { 3 } , P )$ . Consider the equivalence relation ${ \sim } _ { 1 }$ on

$$
\bigoplus _ { T ^ { \prime \prime } \in \mathrm { O b j } ( \mathcal { S } ( Y _ { 2 } , P ) ) } F _ { X _ { 1 } , P } ( T ^ { \prime } , T ^ { \prime \prime } ) \otimes _ { \mathbb { Z } } F _ { X _ { 2 } , P } ( T ^ { \prime \prime } , T ^ { \prime \prime \prime } )
$$

generated by

$$
( a \cdot \beta ) \otimes c \sim _ { 1 } a \otimes ( \beta \cdot c )\tag{3.5}
$$

where $a ~ \in ~ { \cal S } ( { \cal X } _ { 1 } , - { \cal T } ^ { \prime } \cup \widetilde { { \cal T } } ^ { \prime \prime } ) , ~ c ~ \in ~ { \cal S } ( { \cal X } _ { 2 } , - { \cal T } ^ { \prime \prime } \cup { \cal T } ^ { \prime \prime \prime } )$ , and $\beta \ \in \ \mathrm { H o m } _ { S ( Y _ { 2 } , P ) ^ { o p } } ( \widetilde { T } ^ { \prime \prime } , T ^ { \prime \prime } ) \ =$ $\mathrm { H o m } _ { \cal S ( Y _ { 2 } , P ) } ( T ^ { \prime \prime } , \widetilde { T } ^ { \prime \prime } )$ , for some objects $T ^ { \prime \prime } , \widetilde { T } ^ { \prime \prime }$ in $S ( Y _ { 2 } , P )$ See Figure 4 for a schematic depiction of this equivalence relation. (Since we will have more equivalence relations in the next subsection, we number each of them for clarity.)

Definition 3.6. Given the $( S ( Y _ { 1 } , P ) , S ( Y _ { 2 } , P ) )$ -bimodule $F _ { X _ { 1 } , P }$ and the $( S ( Y _ { 2 } , P ) , S ( Y _ { 3 } , P ) ) \bot$ bimodule $F _ { X _ { 2 } , P }$ , we define their tensor product over $S ( Y _ { 2 } , P )$ to be the bifunctor

$$
F _ { X _ { 1 } , P } \otimes _ { S ( Y _ { 2 } , P ) } F _ { X _ { 2 } , P } : S ( Y _ { 1 } , P ) \times S ( Y _ { 3 } , P ) ^ { o p }  \mathcal { V } ,
$$

where $( F _ { X _ { 1 } , P } \otimes _ { S ( Y _ { 2 } , P ) } F _ { X _ { 2 } , P } ) ( T ^ { \prime } , T ^ { \prime \prime \prime } )$ is defined to be

$$
\bigoplus _ { T ^ { \prime \prime } \in \mathrm { O b j } ( S ( Y _ { 2 } , P ) ) } F _ { X _ { 1 } , P } ( T ^ { \prime } , T ^ { \prime \prime } ) \otimes _ { \mathbb { Z } } F _ { X _ { 2 } , P } ( T ^ { \prime \prime } , T ^ { \prime \prime \prime } ) \Big / \sim _ { 1 } .
$$

[[PAGE 7]]
On morphisms, we define $\alpha \cdot \left( a \otimes b \right) \cdot \beta = \left( \alpha \cdot a \right) \otimes \left( b \cdot \beta \right)$ , where $\alpha \in \mathrm { H o m } ( T ^ { \prime } , \widetilde { T } ^ { \prime } )$

<!-- image-->  
Figure 4. A schematic representing the equivalence relation $( a \cdot \beta ) \otimes c \sim _ { 1 }$ $a \otimes ( \beta \cdot c )$ . In words, this relation captures the idea that acting by a morphism on the $\mathrm { \Delta ^ { \circ } l e f t { \Sigma } } ^ { \prime \prime }$ side of $X _ { 1 }$ or “right” side of $X _ { 2 }$ gives the same result once the two pieces are glued along their common boundary. (Orientations have been omitted from this schematic for the sake of clarity.)

Associativity will be discussed after Lemma 3.7. Recall that by Equation 3.2, we have

$$
\bigoplus _ { \stackrel { \scriptstyle \mathrm { T } ^ { \prime \prime } \in } { \mathrm { o b j } ( S ( \Gamma _ { 2 } , P ) ) } } F _ { X _ { 1 } , P } ( T ^ { \prime } , T ^ { \prime \prime } ) \otimes _ { \Sigma } F _ { X _ { 2 } , P } ( T ^ { \prime \prime } , T ^ { \prime \prime \prime } ) = \bigoplus _ { \stackrel { \scriptstyle \mathrm { T } ^ { \prime \prime } : \scriptstyle \mathrm { t a n g l e i n } } { \scriptstyle \mathrm { \partial T ^ { \prime \prime } = P } } } S ( X _ { 1 } , - T ^ { \prime } \cup T ^ { \prime \prime } ) \otimes _ { \ Z } S ( X _ { 2 } , - T ^ { \prime \prime } \cup T ^ { \prime \prime \prime } ) .
$$

This motivates the following lemma.

Lemma 3.7. The map

$$
\tau : ( \bigoplus _ { T ^ { \prime \prime } \in \operatorname { o b j } ( \mathcal { S } ( Y _ { 2 } , P ) ) } S ( X _ { 1 } , - T ^ { \prime } \cup T ^ { \prime \prime } ) \otimes _ { \mathbb { Z } } S ( X _ { 2 } , - T ^ { \prime \prime } \cup T ^ { \prime \prime } ) / \lnot ) \to S ( X _ { 1 } \cup X _ { 2 } , - T ^ { \prime } \cup T ^ { \prime \prime \prime } )
$$

sending [a ⊗ c] to a ∪ c is an isomorphism.

Proof. Consider the map $\widehat { \tau }$ which has the same domain as τ but without taking the quotient by ${ \sim } _ { 1 }$ b, and the same codomain as $\tau$ . The map $\widehat { \tau }$ is defined by gluing the skein lasagna fillings, ${ \widehat { \tau } } ( a \otimes c ) = a \cup c$ b. It was observed in [RW24, Proposition 2.3] that this map, which is the bsame as the map in Equation 2.3 when the 4-manifolds in question do not have corners, is surjective. Note that the values of $\widehat { \tau }$ on $( a \cdot \beta ) \otimes c$ and on $a \otimes ( \beta \cdot c )$ are both equal to bthe result of gluing the skein lasagna fillings $a \cup \beta \cup c$ in $X _ { 1 } \cup ( Y _ { 2 } \times I ) \cup X _ { 2 }$ . Therefore $\widehat { \tau } ( ( a \cdot \beta ) \otimes c - a \otimes ( \beta \cdot c ) ) = 0$ and $\widehat { \tau }$ descends to a well-defined map τ .

bTo prove that it is an isomorphism, we will construct its inverse $\tau ^ { - 1 }$ . Denote $X : = X _ { 1 } \cup X _ { 2 }$ and let F be a skein lasagna filling in $S ( X , - T ^ { \prime } \cup T ^ { \prime \prime \prime } )$ . Let B denote the union of the input balls of F , S the union of surfaces in F , and $\mathfrak { S } : = S \cup B$ . After an isotopy we can assume that S is transverse to $Y _ { 2 }$ . Here transverse means that $B \cap Y _ { 2 } = \emptyset$ , and the surface $S$ in the lasagna filling is transverse to $Y _ { 2 }$ in the usual sense, as submanifolds of $X$ . Transversality can be achieved because B is a neighborhood in X of a finite collection points which can be moved off of $Y _ { 2 }$ , and B can be shrunk by an isotopy to be disjoint from $Y _ { 2 }$ as well. Then (∂S) $\cap Y _ { 2 } = \emptyset$ and S ⋔ $Y _ { 2 }$ is arranged as usual.

[[PAGE 8]]
Considering

$$
\begin{array} { r } { T ^ { \prime \prime } : = S \cap Y _ { 2 } , \ a : = F \cap X _ { 1 } , \ c : = F \cap X _ { 2 } , } \end{array}
$$

we send $F \in { \mathcal { S } } ( X , - T ^ { \prime } \cup T ^ { \prime \prime \prime } )$ to

$$
a \otimes c \in \left( \bigoplus _ { T ^ { \prime \prime } } { \mathcal { S } } ( X _ { 1 } , - T ^ { \prime } \cup T ^ { \prime \prime } ) \otimes _ { \mathbb { Z } } { \mathcal { S } } ( X _ { 2 } , - T ^ { \prime \prime } \cup T ^ { \prime \prime \prime } ) \right) .
$$

Here $a = F \cap X _ { 1 }$ means that the input balls and the surfaces of a are given by ${ \mathfrak { S } } \cap X _ { 1 }$ and the Khovanov-Rozansky homology labels in a of the boundary links in ∂B are inherited from F .

Next we show that the results $a \otimes c , a ^ { \prime } \otimes c ^ { \prime }$ of two isotopies of a skein lasagna filling F are equal modulo the equivalence relation ${ \sim } _ { 1 }$ . Consider two isotopic (in X) representatives of $F .$

<!-- image-->  
Figure 5. An isotopy of an input ball.

${ \mathfrak { S } } = S \cup B$ and ${ \mathfrak { S } } ^ { \prime } = { \mathfrak { S } } ^ { \prime } \cup B ^ { \prime }$ . Pick a point in each input ball $B ;$ for simplicity of notation suppose B consists of a single ball and denote the point by $p \in B$

Let H denote the given ambient isotopy $H \colon X \times I \to X \times I$ taking B to $B ^ { \prime }$ , and consider the inclusion ${ \mathfrak { S } } \times I \hookrightarrow X \times I$ . Consider the restriction of the isotopy H to $\{ p \} \times I ;$ the path $\gamma$ given by the track of this isotopy $\{ p \} \times I  X \times I  X$ is illustrated in Figure 5. We can assume that $\gamma$ is transverse to $Y _ { 2 }$ . Let $\{ t _ { i } \}$ be a finite collection of times when $\gamma$ intersects $Y _ { 2 }$

Consider a small neighborhood of p: a 4-ball $D \subset B$ . This neighborhood may be chosen sufficiently small so that near each time $t _ { i }$ the isotopy H moves the ball D from $X _ { 1 }$ straight across $Y _ { 2 }$ to $X _ { 2 }$ , or vice versa. Consider an ambient isotopy that shrinks $B$ to $D$ . Then local isotopies that take $D$ across $Y _ { 2 }$ give lasagna fillings that are equivalent under ${ \sim } _ { 1 }$ . Note that when an input ball $B$ is pushed across $Y _ { 2 } .$ , all of the surfaces $S$ attached to $B$ are isotoped as well, so the intersection $S \cap Y _ { 2 }$ changes.

There are finitely many distinct times during the isotopy H when the topology of the intersection of S with $X _ { 1 }$ and with $X _ { 2 }$ changes. These singular events consist of the balls B being pushed across $Y _ { 2 }$ as above, one at a time, and the intersection $S \cap Y _ { 2 }$ undergoing Morse singularities (away from the boundaries of S). The final step in the proof is to use fragmentation of H into a finite sequence of isotopies so that each of the finitely many singular events described above is implemented by its own local isotopy.

The isotopy H has a corresponding vector field V on $\begin{array} { r } { X \times I , V ( x , t ) = \frac { \partial } { \partial t } H ( x , t ) } \end{array}$ whose vertical component is $\partial / \partial t$ . Rescaling the horizontal component of the vector field by a function g : $X \times I  \mathbb { R } _ { > 0 } , V ( x , t ) \mapsto g ( x , t ) V ( x , t )$ has the effect of reparametrizing the integral curves of the vector field. A singular event takes place in $U \colon = { \mathcal { B } } \times \left\lceil t _ { i } - \delta , t _ { i } + \delta \right\rceil \subset X \times I$ where $B \subset X$ is a 4-ball neighborhood of a point in $Y _ { 2 }$ , and $\delta > 0$ is small. It follows from the fragmentation lemma [Ban97] that the isotopy H can be represented as a composition of local isotopies $H _ { i }$ supported in neighborhoods as above. Since $H _ { i }$ is the identity on the complement of $U _ { : }$ , the difference between the tensor products $a \otimes c$ before and after a given singular event differ by $\sim _ { 1 }$

[[PAGE 9]]
Skein lasagna relations involve a collection of input balls engulfed in a single 4-ball. Since all of the input balls of a given lasagna filling in X may be isotoped into one of the pieces, say $X _ { 1 }$ , the relation in $S ( X )$ is implied by relations in $S ( X _ { 1 } )$ . □

The following theorem summarizes the discussion above, stating a concise tensor product gluing formula.

Theorem 3.8. Let Σ be an oriented, closed surface containing a finite set of signed points P . Let $Y _ { 1 } , Y _ { 2 } , Y _ { 3 }$ be three oriented, compact 3-manifolds with $\partial Y _ { 1 } = \partial Y _ { 2 } = \partial Y _ { 3 } = \Sigma$ , and $X _ { 1 } , X _ { 2 }$ be oriented, compact 4-manifolds with $\partial X _ { 1 } = ( - Y _ { 1 } ) \cup _ { \Sigma } Y _ { 2 }$ and $\partial X _ { 2 } = ( - Y _ { 2 } ) \cup _ { \Sigma } Y _ { 3 }$ . Then

$$
F _ { X _ { 1 } , P } \otimes _ { S ( Y _ { 2 } , P ) } F _ { X _ { 2 } , P } \cong F _ { X _ { 1 } \cup X _ { 2 } , P }\tag{3.9}
$$

as $(  { \boldsymbol { S } } ( Y _ { 1 } ,  { \boldsymbol { P } } ) ,  { \boldsymbol { S } } ( Y _ { 3 } ,  { \boldsymbol { P } } ) )$ -bimodules.

Proof. We will construct the natural isomorphism between the bifunctors in Equation 3.9. By definition,

$$
F _ { X _ { 1 } \cup X _ { 2 } , P } ( T ^ { \prime } , T ^ { \prime \prime \prime } ) = \mathcal { S } ( X _ { 1 } \cup X _ { 2 } , - T ^ { \prime } \cup T ^ { \prime \prime \prime } )
$$

for any $T ^ { \prime } \in \mathrm { O b j } ( S ( Y _ { 1 } , P ) )$ and $T ^ { \prime \prime \prime } \in \mathrm { O b j } ( { \cal S } ( Y _ { 3 } , P ) )$ . By Lemma 3.7, the map

$$
\tau \colon ( F _ { X _ { 1 } , P } \otimes _ { S ( Y _ { 2 } , P ) } F _ { X _ { 2 } , P } ) ( T ^ { \prime } , T ^ { \prime \prime \prime } ) \to F _ { X _ { 1 } \cup X _ { 2 } } ( T ^ { \prime } , T ^ { \prime \prime \prime } )
$$

sending $a \otimes c$ to $a \cup c$ is an isomorphism. Here the map τ depends on the objects $T ^ { \prime }$ and $T ^ { \prime \prime \prime }$ so we will denote it $\tau _ { T ^ { \prime } , T ^ { \prime \prime \prime } }$

To prove the naturality of $\left\{ \tau _ { T ^ { \prime } , T ^ { \prime \prime \prime } } \right\}$ , we need to check that the following diagram is commutative:

$$
\begin{array} { r l } & { F _ { X _ { 1 } , P } \otimes F _ { X _ { 2 } , P } ( T ^ { \prime } , T ^ { \prime \prime \prime } ) \xrightarrow { \tau _ { T ^ { \prime } , T ^ { \prime \prime \prime } } } F _ { X _ { 1 } \cup X _ { 2 } } ( T ^ { \prime } , T ^ { \prime \prime \prime } ) } \\ & { \qquad \quad \alpha \cdot ( - ) \cdot \gamma \Big \downarrow \qquad } \\ & { F _ { X _ { 1 } , P } \otimes F _ { X _ { 2 } , P } ( \widetilde { T } ^ { \prime } , \widetilde { T } ^ { \prime \prime \prime } ) \xrightarrow [ \tau _ { \widetilde { T } ^ { \prime } , \widetilde { T } ^ { \prime \prime \prime } } ] { \sim } F _ { X _ { 1 } \cup X _ { 2 } } ( \widetilde { T } ^ { \prime } , \widetilde { T } ^ { \prime \prime \prime } ) } \end{array}
$$

[[PAGE 10]]
where $\widetilde { T } ^ { \prime } \in \mathrm { O b j } ( S ( Y _ { 1 } , P ) ) , \widetilde { T } ^ { \prime \prime \prime } \in \mathrm { O b j } ( S ( Y _ { 3 } , P ) )$ , and α is a lasagna filling in Hom $\vartriangle { \cal { S } } ( Y _ { 1 } , P ) ^ { } ( T ^ { \prime } , \widetilde { T } ^ { \prime } )$ $\gamma$ is a lasagna filling in Hom $s _ { ( Y _ { 3 } , P ) ^ { o p } } ( T ^ { \prime \prime \prime } , \widetilde { T } ^ { \prime \prime \prime } )$

Indeed, for any a $\otimes c \in F _ { X _ { 1 } , P } \otimes F _ { X _ { 2 } , P } ( T ^ { \prime } , T ^ { \prime \prime \prime } )$ , we have $\tau _ { \widetilde { T } ^ { \prime } , \widetilde { T } ^ { \prime \prime \prime } } ( \alpha \cdot ( a \otimes c ) \cdot \gamma ) = \tau _ { \widetilde { T } ^ { \prime } , \widetilde { T } ^ { \prime \prime \prime } } ( ( \alpha \cdot$ $a ) \otimes ( c \cdot \gamma ) ) = \tau _ { \widetilde { T } ^ { \prime } , \widetilde { T } ^ { \prime \prime \prime } } ( ( \alpha \cup a ) \otimes ( c \cup \gamma ) ) = \alpha \cup a \cup c \cup \gamma .$ , and $\alpha \cdot \left( \bar { \tau _ { T ^ { \prime } , T ^ { \prime \prime \prime } } } ( a \otimes c ) \right) \cdot \gamma = \alpha \cdot ( a \cup c ) \cdot \gamma =$ $\alpha \cup a \cup c \cup \gamma$

Remark 3.10. Considering the special case where $\Sigma = \emptyset$ Theorem 3.8 gives a gluing formula for 4-manifolds with boundary (without corners). Some important special cases of such gluing have been previously considered in the literature, including for example the case of attaching 2-handles to the 4-ball [MN22] and more general handle decompositions [MWW23].

Remark 3.11. It follows from Theorem 3.8 that the tensor product of bimodules associated with cornered 4-manifolds is associative.

3.2. Self-gluing. Our next two gluing formulas, Theorem 3.14 and Theorem 3.15, were originally motivated by the theory of trisections; see Section 3.3 for more details. However we present our results here in a more general setting.

Given an oriented, compact 3-manifold Y with $\partial Y = \Sigma$ and a fixed point set $P \subset \Sigma$ , we obtain a category $S ( Y , P )$ by Definition 2.4. Suppose that X is an oriented, compact 4-manifold with an explicit diffeomorphism $\phi \colon ( - Y ) \cup _ { \Sigma } Y  \partial X$ . Then Definition 3.1 gives us the cornered skein lasagna $( S ( Y , P ) , S ( Y , P ) )$ -bimodule

$$
F _ { X , P } \colon S ( Y , P ) \times S ( Y , P ) ^ { o p } \to \mathcal { V }
$$

sending $( T ^ { \prime } , T ^ { \prime \prime } )$ to ${ \mathcal { S } } ( X , \phi ( - T ^ { \prime } \cup T ^ { \prime \prime } ) )$ We glue X to itself along Y , and define $\bar { X } : =$ $X / \{ \phi ( y ) \sim \phi ( - y ) \}$ for $y \in Y$ . See Figure 6. Our next goal is to study the effect of this self-gluing on the bimodule.

<!-- image-->  
Figure 6. A schematic for self-gluing a cornered 4-manifold along its boundary.

Consider the equivalence relation ${ \sim } _ { 2 }$ on

$$
\bigoplus _ { T \in \mathrm { O b j } ( S ( Y , P ) ) } F _ { X , P } ( T , T )
$$

generated by

$$
a \cdot \beta \sim _ { 2 } \beta \cdot a
$$

where $a \in F _ { X , P } ( T , \widetilde { T } )$ and $\beta \in \mathrm { H o m } _ { S ( Y , P ) ^ { o p } } ( \widetilde { T } , T ) = \mathrm { H o m } _ { S ( Y , P ) } ( T , \widetilde { T } )$ for some object $\widetilde { T }$ in $S ( \boldsymbol { Y } , \boldsymbol { P } )$ . See Figure 7 for a schematic depiction of this equivalence relation.

[[PAGE 11]]
<!-- image-->  
Figure 7. A schematic representing the equivalence relation $a \cdot \beta \sim _ { 2 } \beta \cdot a$ . In words, this relation captures the idea that acting by a morphism on the $\mathrm { \Delta ^ { \circ } l e f t { \Sigma } } ^ { \prime }$ or “right” side of X gives the same result once the manifold is self-glued along its boundary.

Definition 3.12. Given the $( S ( Y , P ) , S ( Y , P ) ,$ )-bimodule $F _ { X , P }$ , we define its $z e r o ^ { t h }$ Hochschild homology to be the $\mathbb { Z } ^ { 2 }$ -graded Z-module

$$
\mathrm { H H } _ { 0 } ( F _ { X , P } ) = \bigoplus _ { T \in \mathrm { O b j } ( S ( Y , P ) ) } F _ { X , P } ( T , T ) { \Big / } \sim _ { 2 } .
$$

Our process for self-gluing will now proceed in several steps. We will remove a neighborhood $\nu ( \Sigma )$ of the surface Σ first, then self-glue, and then fill Σ back in. Without the added step of removing and gluing back in a neighborhood of $\Sigma ,$ we would be forced to require lasagna fillings to intersect $\bar { \Sigma }$ in a point set P . When we remove a neighborhood of Σ with a given point set $P \subset \Sigma$ , the points on Σ will be exchanged for $| P |$ meridional circles on the boundary. For convenience we will identify $P \times S ^ { 1 } \subset \partial ( \Sigma \times D ^ { 2 } )$ and its image under a diffeomorphism $\Sigma \times D ^ { 2 } \to \nu ( \Sigma )$

Let $q \colon X \to { \bar { X } }$ be the quotient map given by self-gluing along $\phi .$ Let $X ^ { 0 } : = X \setminus ( \Sigma \times D _ { \zeta } ^ { 2 } )$ and ${ \bar { X } } ^ { \bar { 0 } } : = { \bar { X } } \setminus ( \Sigma \times D ^ { 2 } )$ , where $D _ { \diagdown } ^ { 2 } \subset X$ is the preimage of the fiber $D ^ { 2 }$ of the normal bundle $\Sigma \times D ^ { 2 } \mathrm { ~ o f ~ } \Sigma \subset \bar { X }$ Note that $\partial \bar { X } ^ { 0 } \cong \Sigma \times S ^ { 1 }$ . See Figure 8 for a summary of the notation for our 4-manifold at various stages of removing and gluing.

<!-- image-->

<!-- image-->

<!-- image-->

<!-- image-->  
Figure 8. A schematic representing X, X0, X¯ , and ${ \bar { X } } ^ { 0 }$ . Here, a “bar” means that the manifold has been glued along $Y$ , and $\mathrm { ~ a ~ } ^ { 6 6 } \mathrm { z e r o } ^ { 3 }$ means that a neighborhood of the surface Σ has been removed. By $Y ^ { 0 }$ , we mean $Y \backslash ( ( \Sigma \times D _ { Z } ^ { 2 } ) \bar { \cap } Y )$

Recall from Equation 3.2 that $F _ { X , P } ( T , T ) = S ( X , \phi ( - T \cup T ) )$ ). Replacing X with $X ^ { 0 }$ amounts to removing a regular neighborhood $\nu ( \Sigma )$ of Σ in X. The inclusion $X ^ { 0 } \subset X$ induces an isomorphism of the skein lasagna modules, as follows. The boundary link $\phi ( - T \cup T )$ is modified near each point $x \in P \subset \Sigma$ by replacing the two radial segments of $\{ x \} \times { \partial { D } ^ { 2 } }$ with $\{ x \}$ times the circular arc in $\partial D _ { \gamma } ^ { 2 }$ . Denote the modified link by $\phi ( - T ^ { \prime } \cup A \cup T ^ { \prime } )$ , where $A$ are the circular arcs. The boundary of any skein lasagna filling F in $\mathcal { S } ( X , \phi ( - T \cup T ) )$ intersects Σ in $P ,$ and the relations in the skein lasagna module may be assumed to miss $\nu ( \Sigma )$ . Removing ${ \cal F } \cap ( \Sigma \times D _ { \cal Z } ^ { 2 } )$ gives a skein lasagna filling $F ^ { 0 }$ in $S ( X ^ { 0 } , \phi ( - T ^ { \prime } \cup A \cup T ^ { \prime } ) )$

[[PAGE 12]]
Lemma 3.13. In the notation as above, let $F _ { T ^ { \prime } } ^ { 0 }$ denote the skein lasagna filling in $S ( { \bar { X } } ^ { 0 } , P { \times } S ^ { 1 } )$ obtained by identifying the two copies of $T ^ { \prime }$ . The map

$$
\rho \colon ( \bigoplus _ { T \in \mathrm { O b j } ( S ( Y , P ) ) } F _ { X , P } ( T , T ) / \sim _ { 2 } )  S ( \bar { X } ^ { 0 } , P \times S ^ { 1 } )
$$

sending F to $F _ { T ^ { \prime } } ^ { 0 }$ is an isomorphism.

Proof. The construction of the inverse map is directly analogous to the proof of Lemma 3.7. □

The following theorem gives a concise statement of the self-gluing formula.

Theorem 3.14. Let Σ be an oriented, closed surface containing a finite set of signed points P . Let Y be an oriented, compact 3-manifold with $\partial Y = \Sigma$ , and X be an oriented, compact 4-manifold with $\partial X = ( - Y ) \cup _ { \Sigma } Y$ . Then

$$
\mathrm { H H } _ { 0 } ( F _ { X , P } ) \cong { \cal S } ( \bar { X } ^ { 0 } , P \times S ^ { 1 } )
$$

as $\mathbb { Z } ^ { 2 }$ -graded Z-modules.

Proof. By definition,

$$
\mathrm { H H } _ { 0 } ( F _ { X , P } ) = \bigoplus _ { T \in \mathrm { O b j } ( S ( Y , P ) ) } F _ { X , P } ( T , T ) { \Big / } \sim _ { 2 } .
$$

Thus we have a map

$$
\mathrm { H H } _ { 0 } ( F _ { X , P } )  { \cal S } ( \bar { X } ^ { 0 } , P \times S ^ { 1 } )
$$

sending F to $F _ { T ^ { \prime } } ^ { 0 }$ , which is an isomorphism by Lemma 3.13 as desired.

Finally, we glue back in the neighborhood $\Sigma \times D ^ { 2 } -$ in other words, we $\mathrm { g o }$ from ${ \bar { X } } ^ { 0 }$ to $\bar { X } -$ and describe the result on our invariant. This will require the definition of a third equivalence relation, which will be generated by two equivalencies.

Let $P , P ^ { \prime }$ be two finite sets of signed points in Σ of the same cardinality. Let b be an oriented braid properly embedded in $\Sigma \times I$ from P to $P ^ { \prime }$ , meaning $\partial b = ( - P ) \times \{ - 1 \} \cup P ^ { \prime } \times \{ 1 \}$ . Then $b \times S ^ { 1 }$ is an oriented surface in $\Sigma \times S ^ { 1 } \times I$ , with boundary $( - P \times S ^ { 1 } ) \times \bar { \{ - 1 \} } \cup ( P ^ { \prime } \times \bar { S } ^ { \bar { 1 } } ) \times \{ 1 \}$ By concatenating with the lasagna fillings of $( \bar { X } ^ { 0 } , P \times \bar { S } ^ { 1 } )$ , we obtain a linear map

$$
\beta ( b ) \colon S ( \bar { X } ^ { 0 } , P \times S ^ { 1 } ) \to S ( \bar { X } ^ { 0 } , P ^ { \prime } \times S ^ { 1 } ) .
$$

On the other hand, suppose $p _ { + } , p _ { - } \in \Sigma \setminus P$ are a pair of points with opposite signs. Then $\{ p _ { + } , p _ { - } \} \times S ^ { 1 }$ bounds an annulus $A _ { p _ { + } , p _ { - } }$ in ${ \bar { X } } ^ { 0 }$ . For any lasagna filling F of $( \bar { X } ^ { 0 } , P \times S ^ { 1 } )$ ， we can take the connected sum $F \# A _ { p _ { + } , p }$ between any component of $F$ and $A _ { p + , p _ { - } }$ . Note that $F \# A _ { p _ { + } , p _ { - } }$ is a lasagna filling of $( \ \dot { X } ^ { \hat { 0 } } , ( P \cup \{ p _ { + } , p _ { - } \} ) \times S ^ { 1 } )$

Now consider the equivalence relation $\sim _ { 3 }$ on

$$
\bigoplus _ { P } { \cal S } ( { \bar { X } } ^ { 0 } , P \times S ^ { 1 } )
$$

generated by

$$
\beta ( b ) ( F ) \sim _ { 3 } F , \quad F \# A _ { p _ { + } , p _ { - } } \sim _ { 3 } F
$$

[[PAGE 13]]
for any $F \in { \mathcal { S } } ( { \bar { X } } ^ { 0 } , P \times S ^ { 1 } )$ , any braid b in $\Sigma \times I$ from P to some $P ^ { \prime } \sim P$ , and any pair of points $p _ { + } , p _ { - } \in \Sigma \setminus P$ with opposite signs. See Figure 9 for a schematic depiction of this equivalence relation.

Theorem 3.15. There is an isomorphism

$$
( \bigoplus _ { P } { \cal S } ( \bar { \cal X } ^ { 0 } , P \times { \cal S } ^ { 1 } ) / \sim _ { 3 } ) \cong { \cal S } ( \bar { \cal X } ) .
$$

Proof. Consider the map $\phi \colon \bigoplus _ { P } { \mathcal { S } } ( { \bar { X } } ^ { 0 } , P \times S ^ { 1 } ) \to S ( { \bar { X } } )$ sending a lasagna filling F with boundary $P \times S ^ { 1 } \subset \Sigma \times S ^ { 1 }$ to a lasagna filling in X¯ obtained from F by capping it off with meridional disks $P \times D ^ { 2 }$ . This map is surjective: starting with any lasagna filling $F ^ { \prime }$ in ${ \cal { S } } ( { \bar { X } } )$ make it transverse to $\Sigma \times \{ 0 \} \subset \bar { \Sigma } \times D ^ { 2 } \subset \bar { X }$ so the input balls are disjoint from Σ, and the surfaces in F intersect Σ in a finite collection of points P . Intersecting with the complement of an open tubular neighborhood of Σ, we obtain a filling F in $S ( { \bar { X } } ^ { 0 } , P \times S ^ { 1 } )$ which is sent to $F ^ { \prime }$ by ϕ. An argument analogous to the proof of [MN22, Theorem 1.1] shows that isotopic representatives of $F ^ { \prime }$ are sent to elements related by $\sim _ { 3 }$ □

<!-- image-->  
Figure 9. A schematic representing the equivalence relation $F \# A _ { p + , p _ { - } } \sim _ { 3 } F$ In words, the relation accounts for the possibility of a lasagna filling F being isotoped to intersect the central surface Σ in a pair of points with opposite sign. This isotopy can be thought of as performing a connected sum between the lasagna filling F and the annulus $A _ { p _ { + } , p _ { - } }$

Remark 3.16. The effect on the skein lasagna module of filling in $\Sigma \times D ^ { 2 }$ to obtain $\bar { X }$ from ${ \bar { X } } ^ { 0 }$ can also be understood in terms of attaching 2, 3, 4-handles as in [MWW23].

3.3. Application to trisections. Trisections, due to Gay and Kirby [GK16], are decompositions of 4-manifolds which are analogous to Heegaard splittings of 3-manifolds.

Definition 3.17 ([GK16]). A $( g ; k _ { 1 } , k _ { 2 } , k _ { 3 } )$ -trisection of a closed, connected, oriented, smooth 4-manifold $X ^ { 4 }$ is a decomposition $X ^ { 4 } = X _ { 1 } \cup X _ { 2 } \cup X _ { 3 }$ satisfying:

(1) each $X _ { i }$ is diffeomorphic to $\mathsf { \Omega } _ { { \mathsf { H } } _ { k _ { i } } } ( S ^ { 1 } \times B ^ { 3 } )$ , that is, a 4-dimensional 1-handlebody $Z _ { k _ { i } }$

(2) each $Y _ { i , i + 1 } : = X _ { i } \cap X _ { i + 1 }$ (taking i (mod 3)) is diffeomorphic to $\mathsf { \Omega } \mathsf { { q } } _ { g } ( S ^ { 1 } \times B ^ { 2 } )$ , that is, a genus g 3-dimensional handlebody $H _ { g }$ , and

(3) the triple intersection $X _ { 1 } \cap X _ { 2 } \cap X _ { 3 }$ is a closed, oriented, genus g surface $\Sigma _ { g } ,$ which is referred to as the central surface.

This decomposition is depicted schematically in Figure 10 (left).

<!-- image-->  
Figure 10. On the left is a schematic depiction of a trisection $X ^ { 4 } = X _ { 1 } \cup$ $X _ { 2 } \cup X _ { 3 }$ . On the right is a trisection diagram for $\mathbb { C P } ^ { 2 }$ ·

Theorem 3.8 allows us to glue two trisection pieces together along a genus g handlebody, so in total we can glue three pieces to get a 4-manifold $X ^ { \dag }$ with boundary $\partial X \cong - H _ { g } \cup _ { \Sigma _ { g } } H _ { g }$ where $H _ { g }$ is a genus g handlebody. The step that remains, in order to build the closed, trisected 4-manifold X, is to glue $X ^ { \prime }$ to itself by identifying $- H _ { g }$ and $H _ { g }$ . We can accomplish this with Theorem 3.14 and Theorem 3.15.

[[PAGE 14]]
However, to define the categories corresponding to the 3-manifolds $Y _ { i , i + 1 }$ (Definition 2.4), we need to specify the diffeomorphisms $\iota _ { i , i + 1 } \colon \Sigma _ { g }  H _ { g }$ . Similarly, to obtain the bimodules corresponding to the cornered 4-manifolds $X _ { i }$ (Definition 3.1), we need to determine the diffeomorphisms $\phi _ { i } \colon - H _ { g } \cup _ { \Sigma _ { g } } H _ { g }  Z _ { k _ { i } }$ . Next we will describe how to extract the data of these diffeomorphisms from trisection diagrams.

Definition 3.18. A $( g ; k _ { 1 } , k _ { 2 } , k _ { 3 } )$ -trisection diagram is a tuple $( \Sigma _ { g } ; \alpha , \beta , \gamma )$ such that:

- each of $\alpha , \beta ,$ , and γ is a cut system of curves for $\Sigma _ { g }$ , and

- each of $( \Sigma _ { g } ; \alpha , \beta ) , ( \Sigma _ { g } ; \beta , \gamma )$ , and $( \Sigma ; \gamma , \alpha )$ is a genus g Heegaard diagram for $\# ^ { k _ { i } } S ^ { 1 } \times S ^ { 2 }$ (respectively).

See Figure 10 (right) for an example. We refer the readers to [GK16] for a detailed discussion of the relationship between trisections and trisection diagrams.

Given a trisection diagram $( \Sigma _ { g } ; \alpha , \beta , \gamma )$ of X, consider the diffeomorphism $\iota _ { 3 , 1 } \colon \Sigma _ { g }  \partial H _ { g }$ that sends the g α-curves on $\Sigma _ { g }$ to the g meridian curves on $\partial H _ { g } .$ . Fix a finite set of signed points $P$ on $\Sigma _ { g }$ . By Definition 2.4, the diffeomorphism $\iota _ { 3 , 1 }$ gives rise to a category $S ( H _ { g } , P )$ Similarly, we can consider the diffeomorphism $\iota _ { 1 , 2 } \colon \Sigma _ { g }  \partial H _ { g }$ sending the g β-curves on $\Sigma _ { g }$ to the $g$ meridian curves on $\partial H _ { g }$ , and the diffeomorphism $l _ { 2 , 3 } \colon \Sigma _ { g }  \partial H _ { g }$ sending the $g$ γ-curves on $\Sigma _ { g }$ to the g meridian curves on $\partial H _ { g }$ . To distinguish the three resulting categories, we denote the category corresponding to the diffeomorphism $\iota _ { i , j }$ by $S ( Y _ { i , j } , P )$

We know that the Heegaard diagram $( \Sigma ; \alpha , \beta )$ is equivalent to the standard Heegaard splitting of $\partial Z _ { k _ { 1 } }$ . Let $\phi _ { 1 } \colon - H _ { g } \cup _ { \Sigma _ { q } } H _ { g } \to \partial Z _ { k _ { 1 } }$ be the diffeomorphism induced by this equivalence. By definition, the diffeomorphism $\phi _ { 1 }$ gives rise to an $( S ( Y _ { 3 , 1 } , P ) , S ( Y _ { 1 , 2 } , P ) ) .$ - bimodule $F _ { Z _ { k _ { 1 } } , P } ,$ which will be denoted as $F _ { X _ { 1 } , P }$ . We similarly consider the Heegaard diagrams $( \Sigma _ { g } ; \bar { \beta } , \gamma )$ and $\left( \Sigma _ { g } ; \gamma , \alpha \right)$ , to obtain an $( S ( Y _ { 1 , 2 } , P ) , S ( Y _ { 2 , 3 } , P ) )$ )-bimodule $F _ { X _ { 2 } , P }$ , and an $( { \cal S } ( Y _ { 2 , 3 } , \bar { P } ) , { \cal S } ( Y _ { 3 , 1 } , P ) )$ )-bimodule $F _ { X _ { 3 } , P }$ .

Corollary 3.19. Let X be a closed 4-manifold. Given a trisection $X = X _ { 1 } \cup X _ { 2 } \cup X _ { 3 }$ , and a finite set of signed points P in the central surface $\Sigma _ { g }$ , then

[[PAGE 15]]
$$
\mathcal { S } ( \boldsymbol { X } \setminus \nu ( \Sigma _ { g } ) ; P \times S ^ { 1 } ) \cong \mathrm { H H } _ { 0 } ( F _ { X _ { 1 } , P } \otimes _ { S ( Y _ { 1 , 2 } ; P ) } F _ { X _ { 2 } , P } \otimes _ { S ( Y _ { 2 , 3 } ; P ) } F _ { X _ { 3 } , P } ) .
$$

Here $\mathrm { H H } _ { 0 }$ denotes the $\mathrm { z e r o } ^ { \mathrm { t h } }$ Hochschild homology; see Definition 3.12.

## 4. The invariant of closed surfaces

In this section we describe an extension of the theory down to two dimensions.

Definition 4.1. To an oriented surface Σ we associate the bicategory $S ( \Sigma )$ defined as follows.

- The objects of $S ( \Sigma )$ are oriented closed 0-manifolds embedded in Σ, that is, finite sets of signed points in Σ.

- The 1-cells between two sets of signed points P and $Q$ are oriented tangles embedded in $\Sigma \times I$ , with boundary $- Q \times \{ - 1 \} \sqcup P \times \{ 1 \}$ . The identity 1-cell from $P$ to $P$ is given by the trivial tangle $P \times I$

- Given tangles b′ and b from P to $Q$ , let L denote the oriented link

$$
\left( P \times \{ 1 \} \times I \right) \cup \left( - b \times \{ - 1 \} \right) \cup \left( - Q \times \{ - 1 \} \times I \right) \cup \left( - b \times \{ 1 \} \right)
$$

Then the 2-cells from b′ to b are the elements in $ { \boldsymbol { S } } (  { \boldsymbol { \Sigma } } \times  { \boldsymbol { I } } \times  { \boldsymbol { I } } ,  { \boldsymbol { L } } )$

Compositions of 1-cells are stacking of tangles, followed by a rescaling of I. Horizontal composition of 2-cells is modeled on stacking lasagna fillings along the first interval factor I, while vertical composition of 2-cells is modeled on stacking lasagna fillings along the second interval factor I. Both are implemented by the gluing map in Equation 2.3, followed by a rescaling of I.

Given 1-cells $b _ { 1 } , b _ { 2 } , b _ { 3 }$ , the associator from $\left( b _ { 1 } \circ b _ { 2 } \right) \circ b _ { 3 }$ to $b _ { 1 } \circ \left( b _ { 2 } \circ b _ { 3 } \right)$ is the isotopy between the two tangles given by rescaling I, considered as a lasagna filling embedded in $\Sigma \times I \times I$ Given a 1-cell b from P to $Q$ , the left unitor from $( Q \times I ) \cup b$ to b and the right unitor from $b \cup ( P \times I )$ to b are likewise given by isotopies.

<!-- image-->  
Figure 11. The 4-manifold $\Sigma \times I \times I$ with the link $L = \left( P \times \{ 1 \} \times I \right) \cup ( - b \times$ $\{ - 1 \} ) \cup ( - Q \times \{ - 1 \} \times I ) \cup ( b ^ { \prime } \times \{ 1 \} )$ on its boundary.

Let Cat denote the bicategory of bimodules over small categories enriched in $\mathbb { Z } ^ { 2 } .$ -graded Z-modules. The objects of Cat are enriched small categories, the 1-cells between two categories C and D are $( \mathcal { C } , \mathcal { D } )$ -bimodules, i.e. bifunctors from ${ \mathcal { C } } \times { \mathcal { D } } ^ { o p }$ to V (see Definition 3.1). The identity 1-cell $i d _ { \mathcal { C } }$ from C to C is given by the hom-functor sending $( x , y )$ to Hom(x, y). Given two $( \mathcal { C } , \mathcal { D } )$ -bimodules M and $M ^ { \prime }$ , the 2-cells from M to $M ^ { \prime }$ are natural transformations from M to $M ^ { \prime }$ , sometimes called bimodule homomorphisms. (See also [Bor94, Chapter 7] for a related discussion of the bicategory of profunctors, and see [JY21, Example 2.1.26] for a related example.)

[[PAGE 16]]
Composition of 1-cells is the tensor product of bimodules. Vertical composition of 2- cells is composition of bimodule homomorphisms, and horizontal composition of 2-cells is tensor product of bimodule homomorphisms. Let M be a (B, C)-bimodule, N be a $( \mathcal { C } , \mathcal { D } )$ bimodule, and P be a (D, E)-bimodule. The associator is given by the natural isomorphism $( M \otimes _ { { \mathcal { C } } } N ) \otimes _ { { \mathcal { D } } } P \cong M \otimes _ { { \mathcal { C } } } ( N \otimes _ { { \mathcal { D } } } P )$ , and the left unitor and the right unitor are given by the natural isomorphisms $N \otimes _ { \mathcal { D } } i d _ { \mathcal { D } } \cong N$ and $i d _ { \mathcal { C } } \otimes _ { \mathcal { C } } N \cong N$ respectively.

Definition 4.2. Let C be a bicategory. A left C-module is a pseudofunctor from C to Cat. A right C-module is a pseudofunctor from ${ \mathfrak { C } } ^ { o p }$ to Cat.

To a 3-manifold Y with an orientation-preserving diffeomorphism $\iota \colon \Sigma  \partial Y$ we associate a right module over the bicategory S(Σ).

Definition 4.3. We define the right $S ( \Sigma )$ -module $S _ { Y } \colon S ( \Sigma ) ^ { o p } \to { \mathfrak { C a t } }$ as follows.

- For a signed point set $P \subset \partial Y$ , define $S _ { Y } ( P ) = { \cal S } ( Y , P )$ , the category associated to the 3-manifold Y and the point set P in Definition 2.4.

- For a 1-cell b in $S ( \Sigma ) ^ { o p }$ from $Q$ to P , the $( S ( Y , Q ) , S ( Y , P ) )$ )-bimodule $S _ { Y } ( b )$ is a bifunctor

$$
S _ { Y } ( b ) \colon S ( Y , Q ) \times S ( Y , P ) ^ { o p } \to \mathcal { V } .
$$

For a pair of tangles $u \in \mathrm { O b j } ( S ( Y , Q ) )$ and $u ^ { \prime } \in \mathrm { O b j } ( S ( Y , P ) )$ , define

$$
\mathcal { S } _ { Y } ( b ) ( T , \widetilde { T } ) = { \cal S } ( Y \times I , ( u \times \{ - 1 \} ) \cup b \cup ( - u ^ { \prime } \times \{ 1 \} ) ) .
$$

See Figure 12 (left). For a pair of lasagna fillings $\alpha , \alpha ^ { \prime } ,$ define $S _ { Y } ( b ) ( \alpha , \alpha ^ { \prime } )$ to be the linear map induced by concatenating −α and $- \alpha ^ { \prime }$

- For a 2-cell $\beta$ in $S ( \Sigma ) ^ { o p }$ from b to $b _ { \textrm { \tiny m b } } ^ { \prime }$ , which is a lasagna filling in $S ( \Sigma \times I \times I , ( P \times$ $\{ 1 \} \times I ) \cup ( - b \times \{ - 1 \} ) \cup ( - Q \times \{ - 1 \} \times I ) \cup ( b ^ { \prime } \times \{ 1 \} )$ as shown in Figure 11, we first collapse both $\Sigma \times \{ - 1 \} \times I$ and $\Sigma \times \{ 1 \} \times I$ along the interval I, then denote the resulting “pinched” lasagna filling still by $\beta .$

Define $S _ { Y } ( \beta )$ to be the bimodule homomorphism from $S _ { Y } ( b )$ to ${ \cal { S } } _ { Y } ( b ^ { \prime } )$ , induced by concatenating the pinched $\beta$ on top of the lasagna fillings in $Y \times I ;$ see Figure 12 (right).

<!-- image-->  
Figure 12. Left: for a tangle $b ,$ the bimodule ${ \cal { S } } _ { Y } ( b ^ { \prime } )$ sends a pair of tangles $u , u ^ { \prime }$ to the skein lasagna module $\displaystyle \mathcal { S } ( Y \times I , ( u \times \{ - 1 \} ) \cup b \cup ( - u ^ { \prime } \times \{ 1 \} ) )$ . Right: for a lasagna filling $\beta$ in $\Sigma \times I \times I$ , the bimodule homomorphism $S _ { Y } ( \beta )$ is induced by stacking the pinched $\beta$ on top of the lasagna fillings in $Y \times I$

If $\iota \colon \Sigma  \partial Y$ is an orientation-reversing diffeomorphism, then we obtain a left $S ( \Sigma )$ -module $S _ { Y } \colon S ( \Sigma ) \to \mathfrak { C } a t$ instead. Again, if the diffeomorphism ι has no ambiguity in context, we will write $\partial Y = \Sigma$ if ι is orientation-preserving, write $\partial Y = - \Sigma { \mathrm { ~ i f ~ } } \iota$ is orientation-reversing.

[[PAGE 17]]
To formulate a gluing formula for 3-manifold categories, next we define the tensor product of $S ( \Sigma )$ -modules. Recall from the last item of Definition 4.3 that a 2-cell $\beta$ in $S ( \Sigma ) ^ { o p }$ from b to $b ^ { \prime }$ induces (by vertical gluing, as shown in Figure 12 (right)) maps

$$
\begin{array} { r } { S _ { Y _ { 1 } } ( b ) ( u , u ^ { \prime } )  S _ { Y _ { 1 } } ( b ^ { \prime } ) ( u , u ^ { \prime } ) , F \mapsto F \cdot \beta , \mathrm { a n d } S _ { Y _ { 2 } } ( b ^ { \prime } ) ( v , v ^ { \prime } )  S _ { Y _ { 2 } } ( b ) ( v , v ^ { \prime } ) , G \mapsto \beta \cdot G . } \end{array}
$$

Definition 4.4. Given two compact 3-manifolds $Y _ { 1 } , Y _ { 2 }$ with $\partial Y _ { 1 } = \Sigma$ and $\partial Y _ { 2 } = - \Sigma$ , the tensor product ${ \cal S } _ { Y _ { 1 } } \otimes _ { { \cal S } ( \Sigma ) } { \cal S } _ { Y _ { 2 } }$ is the 1-category defined as follows.

- The objects are

$$
\mathrm { O b j } ( S _ { Y _ { 1 } } \otimes _ { S ( \Sigma ) } S _ { Y _ { 2 } } ) = \bigcup _ { P \in \mathrm { O b j } ( S ( \Sigma ) ) } \mathrm { O b j } ( S _ { Y _ { 1 } } ( P ) ) \times \mathrm { O b j } ( S _ { Y _ { 2 } } ( P ) ) .
$$

- Given $u \in \mathrm { O b j } ( S _ { Y _ { 1 } } ( P ) ) , v \in \mathrm { O b j } ( S _ { Y _ { 2 } } ( P ) ) , u ^ { \prime } \in \mathrm { O b j } ( S _ { Y _ { 1 } } ( Q ) ) , v ^ { \prime } \in \mathrm { O b j } ( S _ { Y _ { 2 } } ( Q ) )$ and a horizontal tangle b from P to Q, the morphism set Hom $( ( u , v ) , ( u ^ { \prime } , v ^ { \prime } ) )$ in ${ \cal S } _ { Y _ { 1 } } \otimes _ { { \cal S } ( \Sigma ) } { \cal S } _ { Y _ { 2 } }$ is the graded Z-module

$$
\mathrm { H o m } ( ( u , v ) , ( u ^ { \prime } , v ^ { \prime } ) ) = \left[ \bigoplus _ { b } ^ { } { \mathcal { S } } _ { Y _ { 1 } } ( b ) ( u , u ^ { \prime } ) \otimes _ { \mathbb { Z } } ^ { } { \mathcal { S } } _ { Y _ { 2 } } ( b ) ( v , v ^ { \prime } ) \right] / \sim ,
$$

where the equivalence relation ∼ is generated by $F \otimes ( \beta \cdot G ) \sim ( F \cdot \beta ) \otimes G$ , where $F \in S _ { Y _ { 1 } } ( b ) ( { \bar { u } } , u ^ { \prime } ) , G \in S _ { Y _ { 2 } } ( b ^ { \prime } ) ( v , v ^ { \prime } )$ , Figure 13.

<!-- image-->  
Figure 13. A schematic representation of the equivalence relation $F \otimes ( \beta \cdot G ) \sim$ $( F \cdot \beta ) \otimes G$ . The “pinched” 2-cell $\beta$ is shaded in the figure.

Throughout the rest of this section we will assume that the embedding $\Sigma \subset Y = Y _ { 1 } \cup Y _ { 2 }$ is fixed, while links in $Y$ and skein lasagna fillings in $Y \times I$ can move by isotopies. Given a link $L \subset Y$ transverse to $\Sigma ,$ cut it along Σ to get $( u , v )$ , a pair of tangles in $Y _ { 1 } , Y _ { 2 }$ with common boundary points in Σ. In the proofs below we will consider links with various sub- and superscripts; by convention the corresponding tangles pairs will inherit the same decorations. For example, given $L ^ { \prime } , L ^ { 0 }$ ; the corresponding pairs will be denoted $( u ^ { \prime } , v ^ { \prime } ) , ( u ^ { 0 } , v ^ { 0 } )$ respectively.

Lemma 4.5. If L, L′ are isotopic links in Y transverse to $\Sigma _ { i }$ , the resulting pairs $( u , v ) , ( u ^ { \prime } , v ^ { \prime } )$ are isomorphic objects in ${ \cal S } _ { Y _ { 1 } } \otimes _ { { \cal S } ( \Sigma ) } { \cal S } _ { Y _ { 2 } }$

[[PAGE 18]]
Proof. Consider the track of an isotopy $A : = ( \sqcup S ^ { 1 } ) \times I \subset Y \times I$ . Applying an isotopy rel boundary if necessary, we may assume this collection of annuli A is transverse to the fixed embedding $\Sigma \times I \subset Y \times I$ . Let $L _ { t }$ denote the slice $( \mathsf { L } S ^ { 1 } ) \times \{ t \} , 0 \leq t \leq 1$ , where $L _ { 0 } = L$ and $L _ { 1 } = L ^ { \prime }$

There is a finite collection of times $t _ { i }$ when $L _ { t }$ is tangent to Σ. Let $L _ { i } ^ { \prime }$ denote the link $L _ { t _ { i } - \varepsilon }$ and $L _ { i } ^ { \prime \prime }$ the link $L _ { t _ { i } + \varepsilon }$ The intersection of the track of the isotopy with $Y _ { 1 } \times I$ and $Y _ { 2 } \times I$ gives skein lasagna fillings $F _ { i } \subset Y _ { i } \times I , i = 1 , 2$ . The equivalence class of the tensor product $[ F _ { 1 } \otimes F _ { 2 } ]$ gives morphisms $f \colon ( u _ { i } ^ { \prime } , v _ { i } ^ { \prime } )  ( u _ { i } ^ { \prime \prime } , v _ { i } ^ { \prime \prime } ) , g \colon ( u _ { i } ^ { \prime \prime } , v _ { i } ^ { \prime \prime } )  ( u _ { i } ^ { \prime } , v _ { i } ^ { \prime } )$

<!-- image-->  
Figure 14. Left: a local illustration of a morphism $g \circ f .$ . It is equivalent (moving a pinched 2-cell from $Y _ { 2 } \times I$ to $Y _ { 1 } \times I$ as in as in Figure 13) to the morphism on the right, which is the identity morphism.

The equivalence relation on morphisms in Definition 4.4 implies that $g \circ f = \mathrm { I d } _ { ( u _ { i } ^ { \prime } , v _ { i } ^ { \prime } ) } , f \circ g =$ $\mathrm { I d } _ { ( u _ { i } ^ { \prime \prime } , v _ { i } ^ { \prime \prime } ) }$ , Figure 14. Away from the critical times $\{ t _ { i } \}$ , the isotopy of links does not interact with $\dot { \Sigma } ,$ and the track of the isotopy provides isomorphisms $( u _ { i } ^ { \prime \prime } , v _ { i } ^ { \prime \prime } ) \cong ( u _ { i + 1 } ^ { \prime } , v _ { i + 1 } ^ { \prime } )$ □

Remark 4.6. Different isotopies $L \cong L ^ { \prime }$ may give rise to different isomorphisms $( u , v ) \cong$ $( u ^ { \prime } , v ^ { \prime } )$

Theorem 4.7. Suppose that $Y _ { 1 } , Y _ { 2 }$ are 3-manifolds with $\partial Y _ { 1 } = \Sigma$ and $\partial Y _ { 2 } = - \Sigma$ . Then

$$
S _ { Y } \cong S _ { Y _ { 1 } } \otimes _ { { \cal S } ( \Sigma ) } S _ { Y _ { 2 } } ,
$$

where $Y = Y _ { 1 } \cup _ { \Sigma } Y _ { 2 }$

Proof. We start by setting up a notation for links and their isotopies. For each link $L \subset Y$ consider a fixed representative $L _ { 0 }$ , transverse to $\Sigma$ , in its isotopy class. Also fix an isotopy $H _ { L }$ from $L$ to $L _ { 0 }$ in $Y$ . Note that by Lemma 4.5, $H _ { L }$ gives rise to specific isomorphisms

$$
f _ { u , v } \colon ( u , v ) \mapsto ( u _ { 0 } , v _ { 0 } ) , g _ { u , v } \colon ( u _ { 0 } , v _ { 0 } ) \mapsto ( u , v ) .\tag{4.8}
$$

Define the functors

$$
\alpha \colon S _ { Y _ { 1 } } \otimes _ { { \mathcal { S } } ( \Sigma ) } S _ { Y _ { 2 } } \to S _ { Y } , \beta \colon S _ { Y } \to S _ { Y _ { 1 } } \otimes _ { { \mathcal { S } } ( \Sigma ) } S _ { Y _ { 2 } } .
$$

The first functor α is given on objects and morphisms by gluing tangles and lasagna fillings. Now we define $\beta .$ . It sends an object (a link $L \subset Y )$ to $( u _ { 0 } , v _ { 0 } ) \in \mathrm { O b j } ( S _ { Y _ { 1 } } \otimes _ { S ( \Sigma ) } )$ . In more detail, $L _ { 0 }$ is the fixed representative in the isotopy class of L, transverse to Σ, and $( u _ { 0 } , v _ { 0 } )$ is the results of cutting $L _ { 0 }$ along $\Sigma .$ Note that we could not cut $L$ along Σ to obtain a pair of tangles, in general, because L might not be transverse to Σ. To summarize,

[[PAGE 19]]
$$
\beta ( L ) = ( u _ { 0 } , v _ { 0 } ) .\tag{4.9}
$$

Next we define $\beta$ on morphisms. Let $F \in { \mathrm { H o m } } ( L , L ^ { \prime } )$ , that is $F$ is a skein lasagna filling in $S ( Y \times I , - L \cup L ^ { \prime } )$ . Define $\widetilde { F } : = H _ { L } ^ { - 1 } \circ F \circ H _ { L ^ { \prime } } ,$ a skein lasagna filling in $S ( Y \times I , - L _ { 0 } \cup L _ { 0 } ^ { \prime } )$ obtained by horizontal concatenation of the chosen isotopy $H _ { L } ^ { - 1 } \subset Y \times I$ from $L _ { 0 }$ to $L _ { ; }$ followed by $F _ { ; }$ followed by the isotopy $H _ { L ^ { \prime } }$ from $L ^ { \prime }$ to $L _ { 0 } ^ { \prime }$ . We may assume that $\widetilde { F }$ is transverse to $\Sigma \times I$ by applying an isotopy rel boundary. Cut along $\Sigma \times I$ to get $\widetilde { F } _ { 1 } \otimes \widetilde { F } _ { 2 } \in S _ { Y _ { 1 } } ( b ) ( u _ { 0 } , u _ { 0 } ^ { \prime } ) \otimes \widetilde { S _ { Y _ { 2 } } } ( b ) ( v _ { 0 } , v _ { 0 } ^ { \prime } )$ , where $b : = \widetilde { F } \cap ( \Sigma \times I )$ . An argument directly analogous to the proof of Lemma 3.7 shows that different choices of isotopies making $\breve { \tilde { F } }$ transverse to $\Sigma \times I$ do not affect the class of $\widetilde { F } _ { 1 } \otimes \widetilde { F } _ { 2 }$ modulo the equivalence relation on morphisms in Definition 4.4. Observe that $\beta$ is a functor:

$$
\begin{array} { r l } & { - \ \beta ( \mathrm { I d } _ { ( u , v ) } ) = \mathrm { I d } _ { ( u , v ) } , } \\ & { - \ \beta ( F \circ G ) = \beta ( F ) \circ \beta ( G ) . } \end{array}
$$

Both of these statements follow from the fact that the concatenation of the isotopies $H _ { L } ^ { - 1 } \circ H _ { L }$ is isotopic to the identity isotopy of $L _ { 0 }$

The proof of Theorem 4.7 is concluded by observing that $\beta \circ \alpha$ is naturally isomorphic to the identity functor of ${ \cal S } _ { Y _ { 1 } } \otimes _ { { \cal S } ( \Sigma ) } { \cal S } _ { Y _ { 2 } }$ and that $\alpha \circ \beta$ is naturally isomorphic to the identity functor of $S _ { Y }$

To prove the first statement, let $( u , v ) \in \mathrm { O b j } ( S _ { Y _ { 1 } } \otimes _ { { \mathcal { S } } ( \Sigma ) } S _ { Y _ { 2 } } )$ . Let L denote the link $u \cup v$ in $Y$ , then $\beta ( \alpha ( u , v ) ) = ( u _ { 0 } , v _ { 0 } )$ as in Equation 4.9. Moreover, by Equation 4.8 we have fixed isomorphisms between $( u , v )$ and $( u _ { 0 } , v _ { 0 } )$ Then for any morphism $F \in \operatorname { H o m } ( ( u , v ) , ( u ^ { \prime } , v ^ { \prime } ) )$ , the following diagram commutes:

$$
\begin{array} { r } { \begin{array} { c c c } { ( u , v ) \xrightarrow { F } \left( u ^ { \prime } , v ^ { \prime } \right) } \\ { \bigg \downarrow _ { { f u , v } } } \\ { \beta ( \alpha ( ( u , v ) ) = ( u _ { 0 } , v _ { 0 } ) \xrightarrow { \beta ( \alpha ( F ) ) } \beta ( \alpha ( ( u ^ { \prime } , v ^ { \prime } ) ) = ( u _ { 0 } ^ { \prime } , v _ { 0 } ^ { \prime } ) } \end{array} } \end{array}
$$

because

$$
g _ { u ^ { \prime } , v ^ { \prime } } \circ \widetilde { F } \circ f _ { u , v } = H _ { L } \circ H _ { L } ^ { - 1 } \circ F \circ H _ { L ^ { \prime } } \circ H _ { L ^ { \prime } } ^ { - 1 } \cong F ,
$$

[[PAGE 20]]
where the last equivalence is an isotopy. It follows that the family $\{ f _ { u , v } \}$ provides a natural isomorphism between $\beta$ ◦ α and the identity functor.

The proof that $\alpha \circ \beta$ is naturally isomorphic to $\mathrm { I d } _ { { \cal { S } } _ { Y } }$ is analogous, using isomorphisms (lasagna fillings given by isotopies $H _ { L } )$ between the objects corresponding to isotopic links $L , L _ { 0 }$ □

## Bibliography

[Ban97] Augustin Banyaga. The Structure of Classical Diffeomorphism Groups. Vol. 400. Mathematics and its Applications. Kluwer Academic Publishers Group, Dordrecht, 1997, pp. xii+197 (↑ 8).

[Bor94] Francis Borceux. Handbook of categorical algebra. 1. Vol. 50. Encyclopedia of Mathematics and its Applications. Basic category theory. Cambridge University Press, Cambridge, 1994, pp. xvi+345 (↑ 15).

[DLM19] Christopher L. Douglas, Robert Lipshitz, and Ciprian Manolescu. “Cornered Heegaard Floer homology.” Memoirs of the American Mathematical Society 262.1266 (2019), pp. v+124 (↑ 2).

[DM14] Christopher L. Douglas and Ciprian Manolescu. “On the algebra of cornered Floer homology.” Journal of Topology 7.1 (2014), pp. 1–68 (↑ 2).

[Fre+08] Michael Freedman, Chetan Nayak, Kevin Walker, and Zhenghan Wang. “On picture (2 + 1)-TQFTs.” Topology and Physics. Vol. 12. Nankai Tracts in Mathematics. World Scientific Publishing, Hackensack, NJ, 2008, pp. 19–106 (↑ 2, 3).

[GK16] David Gay and Robion Kirby. “Trisecting 4-manifolds.” Geometry & Topology 20.6 (2016), pp. 3097–3132 (↑ 13, 14).

[JY21] Niles Johnson and Donald Yau. 2-Dimensional Categories. Oxford University Press, Oxford, 2021, pp. xix+615 (↑ 15).

[KR08] Mikhail Khovanov and Lev Rozansky. “Matrix factorizations and link homology.” Fundamenta Mathematicae 199.1 (2008), pp. 1–91 (↑ 1).

[MN22] Ciprian Manolescu and Ikshu Neithalath. “Skein lasagna modules for 2-handlebodies.” Journal für die Reine und Angewandte Mathematik. (Crelle’s Journal) 788 (2022), pp. 37–76 (↑ 1, 9, 13).

[MWW23] Ciprian Manolescu, Kevin Walker, and Paul Wedrich. “Skein lasagna modules and handle decompositions.” Advances in Mathematics 425 (2023), Paper No. 109071, 40 (↑ 1, 2, 4, 9, 13).

[MW12] Scott Morrison and Kevin Walker. “Blob homology.” Geometry & Topology 16.3 (2012), pp. 1481–1607 (↑ 1, 3).

[MWW22] Scott Morrison, Kevin Walker, and Paul Wedrich. “Invariants of 4-manifolds from Khovanov-Rozansky link homology.” Geometry & Topology 26.8 (2022), pp. 3367–3420 (↑ 1, 3).

[MWW24] Scott Morrison, Kevin Walker, and Paul Wedrich. “Invariants of surfaces in smooth 4-manifolds from link homology.” arXiv preprint arXiv:2401.06600 (2024) (↑ 3).

[RW24] Qiuyu Ren and Michael Willis. “Khovanov homology and exotic 4-manifolds.” arXiv preprint arXiv:2402.10452 (2024) (↑ 1, 7).

[SZ24] Ian A. Sullivan and Melissa Zhang. “Kirby belts, categorified projectors, and the skein lasagna module of $S ^ { 2 } \times S ^ { 2 } .$ ” arXiv preprint arXiv:2402.01081 (2024) (↑ 1).

[Wal06] Kevin Walker. TQFTs notes. Available at http://canyon23.net/math/. 2006 (↑ 2, 3).

[Wal16] C. T. C. Wall. Differential Topology. Vol. 156. Cambridge Studies in Advanced Mathematics. Cambridge University Press, Cambridge, 2016, pp. viii+346 (↑ 5).

University of Virginia, Charlottesville, United States Email address: blackwell@virginia.edu URL: https://seblackwell.com

University of Virginia, Charlottesville, United States Email address: krushkal@virginia.edu

University of Virginia, Charlottesville, United States Email address: yl8by@virginia.edu
