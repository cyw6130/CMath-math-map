[[PAGE 1]]
# VERY GOOD GRADINGS ON STRUCTURAL MATRIX RINGS

PATRIK LUNDSTROM, JOHAN <sup>¨</sup> OINERT, LAURA OROZCO, AND H <sup>¨</sup> ECTOR PINEDO <sup>´</sup>

Abstract. Let R be a nonzero associative unital ring, let G be a group, and let $\rho$ be a preorder on $\{ 1 , \ldots , n \}$ . A G-grading on $\rho$ induces a very good G-grading on the structural matrix ring $M _ { n } ( \rho , R )$ . We show that, for each of the properties trivial, symmetric, epsilonstrong and strong, the grading on $\rho$ has the property if and only if the induced ring grading does. The epsilon-crossed product and crossed product properties pass from $\rho$ to the ring, but the converses fail in general. We also give a concrete criterion for epsilon-strongness and show that a very good G-grading on $M _ { n } ( \rho , R )$ that is strong satisfies $| G | \leq n$ . When $\rho$ is an equivalence relation and the neutral component is diagonal, very good gradings correspond bijectively to free partial actions of $G$ on $\{ 1 , \ldots , n \}$ with orbit relation $\rho .$ These gradings are epsilon-crossed products, and over a field the correspondence gives a classification up to graded algebra isomorphism.

## 1. Introduction

Suppose that R is a nonzero associative unital ring with multiplicative identity 1, and let n be a positive integer. There are several natural ways to construct subrings of $M _ { n } ( R )$ , the ring of $n \times n$ matrices over R. One such method is to prescribe the shape of the matrices, as in the subrings of diagonal, upper triangular, or lower triangular matrices.

This idea was formalized by Mitchell in [11, p. 231]. Put ${ \overline { { n } } } : = \{ 1 , \ldots , n \}$ and $\overline { { n } } ^ { 2 } : = \overline { { n } } \times \overline { { n } }$ For each $( i , j ) \in \overline { { n } } ^ { 2 }$ , let $e _ { i , j }$ denote the matrix having 1 in the $( i , j ) \mathrm { - e n t r y }$ and zeros elsewhere. Mitchell defines a pattern to be a subset $\rho$ of $\overline { { n } } ^ { 2 }$ . Associated with such a pattern is the additive subgroup $\sum { } _ { ( i , j ) \in \rho } R e _ { i , j }$ of $M _ { n } ( R )$ , consisting of all matrices whose nonzero entries are restricted to positions belonging to $\rho .$

This additive subgroup is closed under multiplication if and only if $\rho ,$ viewed as a binary relation on ${ \overline { { n } } } ,$ is transitive. It contains the identity matrix of $M _ { n } ( R )$ if and only if $\rho$ is reflexive. Consequently, it is a unital subring of $M _ { n } ( R )$ ) with the same identity if and only if $\rho$ is a preorder on ${ \overline { { n } } } .$

For a preorder $\rho$ on ${ \overline { { n } } } ,$ , we write $\begin{array} { r } { M _ { n } ( \rho , R ) : = \sum _ { ( i , j ) \in \rho } R e _ { i , j } } \end{array}$ for the corresponding subring of $M _ { n } ( R )$ . Following van Wyk [16], we call $M _ { n } ( \rho , R )$ a structural matrix ring. When $\rho$ is a partial order, that is, a reflexive, antisymmetric, and transitive relation, the structural matrix ring $M _ { n } ( \rho , R )$ is the incidence algebra of the finite poset $( \overline { { n } } , \rho )$ . Incidence algebras were introduced by Rota in [14], independently of Mitchell’s work [11].

Structural matrix rings have been studied from several perspectives, including radical and ideal theory [15, 16], automorphism groups and isomorphism problems [5, 7], and applications to coding theory [9].

[[PAGE 2]]
In this article, we focus on a diferent aspect, namely gradings on structural matrix rings. Let G be a group with identity element e, and let S be an associative unital ring. Recall that S is said to be G-graded if there is a family $( S _ { g } ) _ { g \in G }$ of additive subgroups of $S$ such that $S = \oplus _ { g \in G } S _ { g }$ and $S _ { g } S _ { h } \subseteq S _ { g h }$ for all $g , h \in G$ . The elements of $\textstyle \bigcup _ { g \in G } S _ { g }$ are called homogeneous. Group-graded rings include many important classes of rings, such as polynomial rings, skew group rings, twisted group rings, graded matrix rings, crossed products, and their partial analogues; see, for example, [12, 13].

Several important classes of group gradings have been introduced. The following ones will be particularly relevant in this article. A G-grading $( S _ { g } ) _ { g \in G }$ on S is said to be

• symmetric if $S _ { g } S _ { g ^ { - 1 } } S _ { g } = S _ { g }$ for every $g \in G ;$

• strong if $S _ { g } S _ { g ^ { - 1 } } \stackrel { \textstyle = } { = } S _ { e }$ for every $g \in G ;$

• a crossed product if, for every $g \in G$ , the component $S _ { g }$ contains an element that is invertible in S;

• epsilon-strong if, for every $g \in G$ , there is an element $\epsilon _ { g } \in S _ { g } S _ { g ^ { - 1 } }$ such that

$$
\epsilon_ {g} s = s \epsilon_ {g ^ {- 1}} = s\tag{1}
$$

for every $s \in S _ { g } ;$

• an epsilon-crossed product if it is epsilon-strong and, for every $g \in G ,$ , there are elements $s _ { g } \in S _ { g }$ and $t _ { g ^ { - 1 } } \in S _ { g ^ { - 1 } }$ 1 such that $s _ { g } t _ { g ^ { - 1 } } = \epsilon _ { g }$ and $t _ { g ^ { - 1 } } s _ { g } = \epsilon _ { g ^ { - 1 } }$ ;

• trivial if $S _ { g } = \{ 0 \}$ for every $g \backslash G \backslash \{ e \}$

These classes satisfy certain containments illustrated by the following implications:

$$
\text {   crossed   product   } \Longrightarrow \text {   strong   } \Longrightarrow \text {   epsilon - strong   } \Longrightarrow \text {   symmetric,   }
$$

$$
\text {   crossed   product   } \Longrightarrow \text {   epsilon - crossed   product   } \Longrightarrow \text {   epsilon - strong.   }
$$

Moreover, every trivial grading is an epsilon-crossed product and is therefore epsilon-strong and symmetric. In general, none of the displayed implications can be reversed. For further details, see [12] for general group-graded rings and [13] for epsilon-strongly graded rings.

The starting point of this article is the following observation. Suppose that $\rho$ is a preorder on n and that $( \rho _ { g } ) _ { g \in G }$ is a family of pairwise disjoint subsets of $\rho$ such that $\rho = \textstyle \bigcup _ { q \in G } \rho _ { g }$ and $\rho _ { g } \rho _ { h } \subseteq \rho _ { g h }$ for all $g , h \in G$ . Then, for every $g \in G$ , setting $\begin{array} { r } { M _ { n } ( \rho , R ) _ { g } : = \sum _ { ( i , j ) \in \rho _ { q } } \tilde { R e } _ { i , j } } \end{array}$ defines a G-grading on $M _ { n } ( \rho , R )$ ; see Proposition 16. In this situation, we say that $\rho$ is G-graded and that the induced grading on $M _ { n } ( \rho , R )$ is very good.

This leads to the central question of this article.

## Question 1. How are properties of a G-grading on ρ related to the corresponding properties of the induced very good G-grading on $M _ { n } ( \rho , R ) \ell$ In particular, which grading properties pass between the relation and the structural matrix ring?

To the best of our knowledge, gradings on general structural matrix rings have previously been considered only in [2, 3, 8]. Gradings on full matrix rings, that is, structural matrix rings corresponding to $\rho = \overline { { n } } ^ { 2 }$ , have been studied much more extensively; see, for example, [1, 2, 4, 6] and the references therein. In that setting, the more general notion of a good grading has also been introduced: a grading is good if every matrix unit $e _ { i , j }$ is homogeneous. In this article, however, we focus exclusively on very good gradings, namely those induced by G-gradings on preorders as described above.

Here is an outline of this article. In Section 2, we introduce G-gradings on preorders and several important classes of such gradings. Their relationships are described in Proposition 8.

[[PAGE 3]]
We also prove in Proposition 11 that every graded equivalence relation is epsilon-strong. As a consequence, Corollary 12 shows that every G-grading on $\overline { { n } } ^ { 2 }$ is epsilon-strong.

In Section $^ { 3 , }$ we turn to structural matrix rings. Proposition 16 shows that every G-grading on a preorder $\rho$ induces a very good G-grading on $M _ { n } ( \rho , R )$ . Theorem 20 shows that triviality, symmetry, epsilon-strongness, and strongness are preserved in both directions when passing between a grading on $\rho$ and the induced ring grading. It also shows that the epsilon-crossed product and crossed product properties pass from $\rho$ to the ring. In Example 21 we show that the converses of these latter implications fail for arbitrary coeficient rings. We then obtain a concrete combinatorial criterion for epsilon-strongness and determine the corresponding epsilon elements. We also prove that if $M _ { n } ( \rho , R )$ is equipped with a very good G-grading that is strong, then $| G | \leq n ,$ , with equality only when $\rho = { \overline { { n } } } ^ { 2 } ;$ see Theorem 25.

Finally, in Section 4, we relate very good gradings to partial group actions. When $\rho$ is an equivalence relation, we establish a bijection between the very good G-gradings on $M _ { n } ( \rho , R )$ whose neutral component consists precisely of the diagonal matrices and the free partial actions of G on n whose orbit equivalence relation is $\rho ;$ see Theorem 32. Every grading occurring in this correspondence is an epsilon-crossed product, and strong gradings correspond precisely to global partial actions. In the full matrix case, strictly elementary gradings correspond to free and transitive partial actions; see Corollary 36. When the coeficient ring is a field, we also classify the relevant gradings up to graded algebra isomorphism; see Theorem 42 and Corollary 43.

## 2. G-graded preorders on $\{ 1 , \ldots , n \}$

In this section, we introduce the notation and basic properties of G-graded preorders that will be used throughout this article. Let N denote the set of positive integers, and fix $n \in \mathbb { N }$ Put ${ \overline { { n } } } : = \{ 1 , \dots , n \}$ and $\overline { { n } } ^ { 2 } : = \overline { { n } } \times \overline { { n } }$ . We define an inversion operation on $\overline { { n } } ^ { 2 }$ by

$$
(i, j) ^ {- 1} := (j, i),
$$

for all $i , j \in \overline { { n } }$ , and a partial multiplication by

$$
(i, j) (j, k) := (i, k),
$$

for all $i , j , k \in \overline { { n } }$ . More generally, for subsets $X , Y \subseteq { \overline { { n } } } ^ { 2 }$ , we define

$$
X ^ {- 1} := \left\{(j, i) \in \overline {{n}} ^ {2} \mid (i, j) \in X \right\}
$$

and

$X Y : = \left\{ ( i , k ) \in { \overline { { n } } } ^ { 2 } \right.$ | there exists $j \in \overline { { n } }$ such that $( i , j ) \in X , ( j , k ) \in Y \}$

We denote by $\Delta : = \{ ( i , i ) \mid i \in \overline { { n } } \}$ the diagonal of $\overline { { n } } ^ { 2 }$ . Let $\rho \subseteq { \overline { { n } } } ^ { 2 }$ be a nonempty binary relation on n. Recall that $\rho$ is called reflexive if $\Delta \subseteq \rho ,$ and transitive if $\rho \rho \subseteq \rho$

Throughout this section, $\rho$ denotes a preorder on ${ \overline { { n } } } ,$ and G denotes a group with identity element e.

Definition 1. We say that $\rho$ is G-graded if there is a family $( \rho _ { g } ) _ { g \in G }$ of pairwise disjoint subsets of $\rho$ such that $\textstyle \rho = \bigcup _ { g \in G } \rho _ { g }$ and $\rho _ { g } \rho _ { h } \subseteq \rho _ { g h }$ for all $g , h \in G$ . In that case, we will call $( \rho _ { g } ) _ { g \in G }$ a G-grading on $\rho .$ .

The following elementary observation will be used repeatedly later on.

Proposition 2. Suppose that $\rho$ is G-graded. Then the following assertions hold:

(i) $\Delta \subseteq \rho _ { e } ,$

[[PAGE 4]]
(ii) for every $g \in G , \rho _ { g } = \Delta \rho _ { g } = \rho _ { g } \Delta = \rho _ { e } \rho _ { g } = \rho _ { g } \rho _ { e }$

Proof. For (i), let $i \in \pi$ . Then $( i , i ) \in \rho _ { g }$ for some $g \in G$ . Since $( i , i ) = ( i , i ) ( i , i ) \in \rho _ { g } \rho _ { g } \subseteq \rho _ { g ^ { 2 } }$ we have $( i , i ) \in \rho _ { g } \cap \rho _ { g ^ { 2 } }$ . The sets $\rho _ { h } , h \in G$ , are pairwise disjoint, and hence $g = g ^ { 2 }$ . Therefore, $g = e ,$ , which proves that $\Delta \subseteq \rho _ { e }$

For (ii), let $g \in G$ . Since $\rho$ is reflexive, we have $\Delta \rho _ { g } = \rho _ { g } = \rho _ { g } \Delta$ . By (i) and the grading property, $\rho _ { g } = \Delta \rho _ { g } \subseteq \rho _ { e } \rho _ { g } \subseteq \rho _ { g }$ . Thus $\rho _ { e } \rho _ { g } = \rho _ { g }$ . Similarly, $\rho _ { g } = \rho _ { g } \Delta \subseteq \rho _ { g } \rho _ { e } \subseteq \rho _ { g }$ , and hence $\rho _ { g } \rho _ { e } = \rho _ { g }$ □

Definition 3. We say that a G-grading $( \rho _ { g } ) _ { g \in G }$ on the preorder $\rho$ is:

• trivial if for each $g \in G \backslash \{ e \}$ , the equality $\rho _ { g } = \emptyset$ holds;

• symmetric if for each $g \in G$ the equality $\rho _ { g } \rho _ { g ^ { - 1 } } \rho _ { g } = \rho _ { g }$ holds;

• strong if for each $g \in G$ the equality $\rho _ { g } \rho _ { g ^ { - 1 } } = \rho _ { e }$ holds;

• a crossed product if for each $g \in G$ there are $U _ { g } \subseteq \rho _ { g }$ and $V _ { g ^ { - 1 } } \subseteq \rho _ { g ^ { - 1 } }$ such that the equalities $U _ { g } V _ { g ^ { - 1 } } = V _ { g ^ { - 1 } } U _ { g } = \Delta$ hold;

• epsilon-strong if for each $g \in G$ there is a subset $E _ { g }$ of $( \rho _ { g } \rho _ { g ^ { - 1 } } ) \cap \Delta$ such that for every $( i , j ) \in \rho _ { g }$ , the equalities $( i , j ) = E _ { g } ( i , j ) = ( i , j ) E _ { g ^ { - 1 } }$ hold;

• an epsilon-crossed product if $\rho$ is epsilon-strong (with the sets $E _ { q }$ as above) and for each $g \in G$ , there are $U _ { g } \subseteq \rho _ { g }$ and $V _ { g ^ { - 1 } } \subseteq \rho _ { g ^ { - 1 } }$ such that $U _ { g } V _ { g ^ { - 1 } } = \operatorname { \bar { \cal E } } _ { g }$ and $V _ { g ^ { - 1 } } U _ { g } = E _ { g ^ { - 1 } }$

Remark 4. Suppose that $\rho$ is epsilon-strongly G-graded. Then, for every $g \in G$ , the epsilon set $E _ { g }$ is uniquely determined and is given by $E _ { g } = \rho _ { g } \rho _ { g ^ { - 1 } } \cap \Delta$ Indeed, the inclusion $E _ { g } \subseteq \rho _ { g } \rho _ { g ^ { - 1 } } \cap \Delta$ holds by definition. Conversely, let $( i , i ) \in \bar { \rho } _ { g } \rho _ { q ^ { - 1 } } \cap \Delta$ . Then there is some $j \in \overline { { n } }$ such that $( i , j ) \in \rho _ { g }$ and $( j , i ) \in \rho _ { g ^ { - 1 } }$ . Since $E _ { g } ( i , j ) = ( i , \breve { j } )$ , it follows that $( i , i ) \in E _ { g }$ Thus $\rho _ { g } \rho _ { g ^ { - 1 } } \cap \Delta \subseteq E _ { g }$

Proposition 5. Suppose that ρ is G-graded. The following assertions are equivalent:

(i) ρ is strongly G-graded;

(ii) for all $g , h \in G$ , the equality $\rho _ { g } \rho _ { h } = \rho _ { g h }$ holds.

Proof. $( \mathrm { i } ) { \Rightarrow } ( \mathrm { i } )$ : Suppose that ρ is strongly G-graded. Take $g , h \in G$ . Then $\rho _ { g } \rho _ { h } \subseteq \rho _ { g h } =$ $\rho _ { g h } \rho _ { e } = \rho _ { g h } \rho _ { h ^ { - 1 } } \rho _ { h } \subseteq \rho _ { g h h ^ { - 1 } } \rho _ { h } = \rho _ { g } \rho _ { h }$ . Therefore, $\rho _ { g } \rho _ { h } = \rho _ { g h }$

$( \mathrm { i i } ) { \Rightarrow } ( \mathrm { i } ) ;$ : This is trivial.

Definition 6. Suppose that ρ is G-graded. A subset $\mathcal { T } \subseteq \rho _ { e }$ is called an ideal of $\rho _ { e }$ if $\mathcal { T } \rho _ { e } \subseteq \mathcal { T }$ and $\rho _ { e } \mathcal { I } \subseteq \mathcal { I }$ . We say that the ideal I is unital if there is a subset $I \subseteq { \mathcal { I } } \cap \Delta$ such that $I ( i , j ) = ( i , j ) = ( i , j ) I$ for all $( i , j ) \in \mathcal { T }$ . In that case we will refer to I as the unit of $\mathcal { T }$

Proposition 7. Suppose that $\rho$ is G-graded. The following assertions are equivalent:

(i) ρ is epsilon-strongly G-graded;

(ii) for each $g \in G , \rho _ { g } \rho _ { g ^ { - 1 } }$ is a unital ideal of $\rho _ { e }$ such that for all $g , h \in G$ , the equalities $\rho _ { g } \rho _ { h } = \rho _ { g } \rho _ { g ^ { - 1 } } \rho _ { g h } = \rho _ { g h } \rho _ { h ^ { - 1 } } \rho _ { h }$ hold;

(iii) ρ is symmetrically G-graded and for each $g \in G , \rho _ { g } \rho _ { g ^ { - 1 } }$ is a unital ideal of $\rho _ { e }$ .

Proof. $( \mathrm { i } ) { \Rightarrow } ( \mathrm { i } \mathrm { i } )$ : Suppose that $\rho$ is epsilon-strongly G-graded. Take $g \in G$ . Clearly $\rho _ { g } \rho _ { g } – 1$ is an ideal of $\rho _ { e }$ . By Remark 4, $E _ { g } = \rho _ { g } \rho _ { g ^ { - 1 } } \cap \Delta$ . We claim that $E _ { g }$ is a unit for $\rho _ { g } \rho _ { g } – 1$ . Indeed, take $( i , j ) \in \rho _ { g } \rho _ { g ^ { - 1 } }$ . There is some $k \in \overline { { n } }$ such that $( i , k ) \in \rho _ { g }$ and $( k , j ) \in \rho _ { q ^ { - 1 } }$ . Note that $E _ { g } ( i , k ) = ( i , k )$ and $( k , j ) E _ { g } = ( k , j )$ . Thus, $E _ { g } ( i , j ) = E _ { g } ( i , k ) ( k , j ) = ( i , \check { k } ) ( k , j ) = ( i , j )$ and $( i , j ) E _ { g } = ( i , k ) ( k , j ) E _ { g } = ( i , k ) ( k , j ) = ( i , j )$ , as desired. Now, take $g , h \in G$ . Then

$$
\rho_ {g} \rho_ {h} = E _ {g} \rho_ {g} \rho_ {h} \subseteq \rho_ {g} \rho_ {g ^ {- 1}} \rho_ {g} \rho_ {h} \subseteq \rho_ {g} \rho_ {g ^ {- 1}} \rho_ {g h} \subseteq \rho_ {g} \rho_ {g ^ {- 1} g h} = \rho_ {g} \rho_ {h}
$$

[[PAGE 5]]
and

$$
\rho_ {g} \rho_ {h} = \rho_ {g} \rho_ {h} E _ {h ^ {- 1}} \subseteq \rho_ {g} \rho_ {h} \rho_ {h ^ {- 1}} \rho_ {h} \subseteq \rho_ {g h} \rho_ {h ^ {- 1}} \rho_ {h} \subseteq \rho_ {g h h ^ {- 1}} \rho_ {h} = \rho_ {g} \rho_ {h}
$$

showing that $\rho _ { g } \rho _ { h } = \rho _ { g } \rho _ { g ^ { - 1 } } \rho _ { g h } = \rho _ { g h } \rho _ { h ^ { - 1 } } \rho _ { h }$

(ii)⇒(iii): Put $h = e$ in (ii).

(iii)⇒(i): Suppose that (iii) holds. For each $g \in G ,$ , let $E _ { g }$ denote the unit of the ideal $\rho _ { g } \rho _ { g ^ { - 1 } }$ Note that $E _ { g } \subseteq \Delta$ Take $g \in G$ and $( i , j ) \in \rho _ { g } .$ Since $\rho$ is symmetrically $G \mathrm { - }$ graded, there are $k , l \in { \overline { { n } } }$ such that $( i , k ) , ( l , j ) \in \rho _ { g }$ and $( k , l ) \in \rho _ { g ^ { - 1 } }$ . From $( i , k ) ( k , l ) \in$ $\rho _ { g } \rho _ { g } – 1$ and $( k , l ) ( l , j ) \in \rho _ { q ^ { - 1 } } \rho _ { g }$ it follows that $E _ { g } ( i , k ) ( k , l ) = ( i , k ) ( k , \bar { l } )$ and $( k , l ) ( l , j ) E _ { q ^ { - 1 } } =$ $( \bar { k } , \bar { l } ) ( l , j )$ . Hence, $E _ { g } ( i , \bar { j } ) \stackrel { . . } { = } E _ { g } ( i , k ) ( k , l ) ( l , j ) \stackrel { . } { = } ( i , k ) ( k , l ) ( l , j ) = ( i , j )$ and $( i , j ) E _ { g ^ { - 1 } } =$ $( i , k ) ( k , l ) ( l , j ) E _ { g ^ { - 1 } } = ( i , k ) ( k , l ) ( l , j ) = ( i , j )$ , showing that $\rho$ is epsilon-strongly G-graded. □

## Proposition 8. Suppose that ρ is G-graded. Consider the following properties:

(i) $\rho$ is symmetrically graded;

(ii) $\rho$ is epsilon-strongly graded;

(iii) $\rho$ is an epsilon-crossed product;

(iv) $\rho$ is strongly graded;

(v) $\rho$ is a crossed product;

(vi) $\rho$ is trivially graded.

These properties are related by the following implications:

$$
(v) \Rightarrow (i i i) \Rightarrow (i i) \Rightarrow (i), \quad (v) \Rightarrow (i v) \Rightarrow (i i), \quad a n d \quad (v i) \Rightarrow (i i i).
$$

Proof. $( \mathrm { v } ) { \Rightarrow } ( \mathrm { i i i } )$ : Let $\rho$ be a crossed product with $U _ { g } \subseteq \rho _ { g }$ and $V _ { g ^ { - 1 } } \subseteq \rho _ { g ^ { - 1 } }$ such that $U _ { g } V _ { g ^ { - 1 } } = V _ { g ^ { - 1 } } U _ { g } = \Delta$ , for $g \in G$ . Then $\rho$ is an epsilon-crossed product with $E _ { g } : = \Delta$ , for $g \in { \mathrm { \bar { G } } }$

(iii)⇒(ii): This is trivial.

(ii)⇒(i): This follows from Proposition 7.

(v)⇒(iv): Suppose that $\rho$ is a crossed product. Take $g \in G$ . Since $\rho _ { e } \Delta = \rho _ { e }$ , it follows that $\rho _ { e } = \rho _ { e } \Delta = \rho _ { e } U _ { g } V _ { g ^ { - 1 } } \subseteq \rho _ { e } \rho _ { g } \rho _ { g ^ { - 1 } } \subseteq \rho _ { e g g ^ { - 1 } } = \rho _ { e }$ . Therefore, $\rho _ { e } = \rho _ { e } \rho _ { g } \rho _ { g ^ { - 1 } } = \rho _ { g } \rho _ { g ^ { - 1 } }$ 2 showing that $\rho$ is strongly G-graded.

$( \mathrm { i v } ) { \Rightarrow } ( \mathrm { i i } )$ : Suppose that $\rho$ is strongly graded. It is easy to see that $\rho$ is epsilon-strongly graded with $E _ { q } : = \Delta$ , for all $g \in G$

$( \mathrm { v i } ) { \Rightarrow } ( \mathrm { i i i } )$ : Suppose that $\rho$ is trivially graded. Then $\rho$ is an epsilon-crossed product with $U _ { e } = V _ { e } = E _ { e } = \Delta$ and $U _ { g } = V _ { g } = E _ { g } = \emptyset$ , for $g \in G \backslash \{ e \}$ □

## Example 9. The following examples show that none of the implications in Proposition $8$ can be reversed in general.

(a) $( \mathrm { i i i } ) \{  { \neq } ( \mathrm { v } )$ . Let $\rho : = \overline { { 1 } } ^ { 2 } = \{ ( 1 , 1 ) \}$ , and equip $\rho$ with the trivial $\mathbb { Z } _ { 2 } .$ -grading $\rho _ { 0 } : = \rho$ and $\rho _ { 1 } : = \emptyset$ . By Proposition $^ { 8 , }$ this grading is an epsilon-crossed product. It is not a crossed product, since there are no subsets $U _ { 1 } , V _ { 1 } \subseteq \rho _ { 1 } = \emptyset$ with $U _ { 1 } V _ { 1 } = \Delta$

(b) (ii)̸⇒(iii) and $( \mathrm { i i } ) \phi ( \mathrm { i v } )$ . Let $\rho$ be the preorder on 4 defined by $\rho : = \overline { { 3 } } ^ { 2 } \cup \{ ( 4 , 4 ) \}$ . Define a Z -grading on $\rho$ by

$$
\rho_ {0} := \{(1, 1), (2, 2), (2, 3), (3, 2), (3, 3), (4, 4) \} \quad \text { and } \quad \rho_ {1} := \{(1, 2), (1, 3), (2, 1), (3, 1) \}.
$$

This grading is epsilon-strong with $E _ { 0 } : = \Delta$ and $E _ { 1 } : = \{ ( 1 , 1 ) , ( 2 , 2 ) , ( 3 , 3 ) \}$ . However, $\rho _ { 1 } \rho _ { 1 } =$ $\rho _ { 0 } \setminus \{ ( 4 , 4 ) \} \ne \rho _ { 0 }$ , so the grading is not strong. We claim that it is not an epsilon-crossed product. Indeed, by Remark $^ { 4 , }$ the epsilon set in degree 1 must be $E _ { 1 } = \rho _ { 1 } \rho _ { 1 } \cap \Delta =$ $\{ ( 1 , 1 ) , ( 2 , 2 ) , ( 3 , 3 ) \}$ }. Suppose that there are subsets $U _ { 1 } , V _ { 1 } \subseteq \rho _ { 1 }$ such that $U _ { 1 } V _ { 1 } = E _ { 1 }$ . Since $( 2 , 2 ) \in U _ { 1 } V _ { 1 }$ , we must have $( 2 , 1 ) \in U _ { 1 }$ and $( 1 , 2 ) \in V _ { 1 }$ . Similarly, since $( 3 , 3 ) \in U _ { 1 } V _ { 1 }$ , we must have $( 3 , 1 ) \in U _ { 1 }$ and $( 1 , 3 ) \in V _ { 1 }$ . It follows that $( 2 , 3 ) = ( 2 , 1 ) ( 1 , 3 ) \in U _ { 1 } V _ { 1 }$ , contrary to the equality $U _ { 1 } V _ { 1 } = E _ { 1 }$ . Thus the grading is not an epsilon-crossed product.

[[PAGE 6]]
(c) $( \mathrm { i } ) \neq ( \mathrm { i i } )$ . Let ρ be the preorder on 4 defined by

$$
\Delta \cup \{(1, 2), (1, 3), (1, 4), (2, 3), (2, 4), (3, 2), (3, 4), (4, 2), (4, 3) \}.
$$

Define a $\mathbb { Z } _ { 3 } { \mathrm { - g r a d i n g ~ o n ~ } } \rho$ by

$$
\rho_ {0} := \Delta \cup \{(1, 3), (2, 4), (4, 2) \}, \rho_ {1} := \{(1, 2), (1, 4), (3, 2), (3, 4) \} \text {and} \rho_ {2} := \{(2, 3), (4, 3) \}.
$$

A direct computation gives $\rho _ { 0 } \rho _ { 0 } \rho _ { 0 } = \rho _ { 0 } , \rho _ { 1 } \rho _ { 2 } \rho _ { 1 } = \rho _ { 1 }$ and $\rho _ { 2 } \rho _ { 1 } \rho _ { 2 } = \rho _ { 2 }$ . Hence the grading is symmetric. It is not epsilon-strong. Indeed, $\rho _ { 1 } \rho _ { 2 } = \{ ( 1 , 3 ) , ( 3 , 3 ) \}$ . If there were a subset $E _ { 1 } \subseteq ( \rho _ { 1 } \rho _ { 2 } ) \cap \Delta$ such that $E _ { 1 } ( 1 , 2 ) = ( 1 , 2 )$ , then (1, 1) would belong to $E _ { 1 }$ . This is impossible, since $( 1 , 1 ) \notin \rho _ { 1 } \rho _ { 2 }$

(d) $( \mathrm { i v } ) \phi ( \mathrm { v } )$ . Let $\rho : = \overline { { 3 } } ^ { 2 }$ , and define a $\mathbb { Z } _ { 2 ^ { - } }$ -grading on $\rho$ by

$$
\rho_ {0} := \{(1, 1), (2, 2), (2, 3), (3, 2), (3, 3) \} \quad \text { and } \quad \rho_ {1} := \{(1, 2), (1, 3), (2, 1), (3, 1) \}.
$$

Since $\rho _ { 0 } \rho _ { 0 } = \rho _ { 0 }$ and $\rho _ { 1 } \rho _ { 1 } = \rho _ { 0 }$ , the grading is strong. Suppose, seeking a contradiction, that the grading is a crossed product. Then there are subsets $U _ { 1 } , V _ { 1 } \subseteq \rho _ { 1 }$ such that $U _ { 1 } V _ { 1 } = V _ { 1 } U _ { 1 } =$ ∆. Since (2, 2) belongs to both products, it follows that $( 2 , 1 ) , ( 1 , 2 ) \in U _ { 1 } \cap V _ { 1 }$ . Similarly, since $( 3 , 3 )$ belongs to both products, we obtain $( 3 , 1 ) , ( 1 , 3 ) \in U _ { 1 } \cap V _ { 1 }$ . Therefore, $U _ { 1 } = V _ { 1 } = \rho _ { 1 }$ Consequently, $U _ { 1 } V _ { 1 } = \rho _ { 1 } \rho _ { 1 } = \rho _ { 0 } \neq \Delta$ , which is a contradiction. Hence the grading is not a crossed product.

$( \mathrm { e } ) ( \mathrm { i i i } ) { \neq } ( \mathrm { v i } )$ . Let $\rho : = \overline { { 2 } } ^ { 2 }$ , and define a $\mathbb { Z } _ { 2 } \cdot$ -grading on ρ by $\rho _ { 0 } : = \Delta$ and $\rho _ { 1 } : = \{ ( 1 , 2 ) , ( 2 , 1 ) \}$ Put $U _ { 0 } = V _ { 0 } : = \Delta$ and $U _ { 1 } = V _ { 1 } : = \rho _ { 1 }$ . Then $U _ { 0 } V _ { 0 } = V _ { 0 } U _ { 0 } = \Delta$ and $U _ { 1 } V _ { 1 } = V _ { 1 } U _ { 1 } = \Delta$ . Thus the grading is a crossed product and hence an epsilon-crossed product. Since $\rho _ { 1 } \neq \emptyset$ , it is not trivial.

Recall that a binary relation $\rho$ on $\overline { { n } }$ is called symmetric if $\rho ^ { - 1 } = \rho$ . Since $\rho$ is already assumed to be a preorder, it is an equivalence relation if and only if it is symmetric.

## Lemma 10. Suppose that ρ is G-graded. $I f \left( i , j \right) \in \rho _ { g }$ and $( j , i ) \in \rho _ { ; }$ , then $( j , i ) \in \rho _ { g ^ { - 1 } }$

Proof. Suppose that $( i , j ) \in \rho _ { g }$ and $( j , i ) \in \rho$ . Then $( j , i ) \in \rho _ { h }$ for some $h \in G$ . Note that $\rho _ { e } \supseteq \Delta \ni ( i , i ) = ( i , j ) ( j , i ) \in \rho _ { g } \rho _ { h } \subseteq \rho _ { g h }$ . Thus, $e = g h$ , showing that $h = g ^ { - 1 }$ □

Proposition 11. Suppose that $\rho$ is G-graded. The following assertions are equivalent:

(i) ρ is an equivalence relation;

(ii) $\rho _ { e }$ is an equivalence relation and ρ is epsilon-strongly G-graded;

(iii) $\rho _ { e }$ is an equivalence relation and ρ is symmetrically G-graded;

(iv) for each $g \in G$ , the equality $( \rho _ { g } ) ^ { - 1 } = \rho _ { g ^ { - 1 } }$ holds.

Proof. $( \mathrm { i } ) { \Rightarrow } ( \mathrm { i } )$ : Suppose that (i) holds. It is easy to see that $\rho _ { e }$ is reflexive and transitive. The symmetry of $\rho _ { e }$ follows from Lemma 10. Now, take $g \in G$ and $( i , j ) \in \rho _ { g }$ . By Lemma 10, $( j , i ) \in \rho _ { g ^ { - 1 } }$ . Set $E _ { g } : = \rho _ { g } \rho _ { g ^ { - 1 } } \cap \Delta$ . Note that $( i , i ) = ( i , j ) ( j , i ) \in E _ { g }$ and $( j , j ) = ( j , i ) ( i , j ) \in$ $E _ { g ^ { - 1 } }$ . Clearly, $E _ { g } ( i , j ) = ( i , j ) = ( i , j ) E _ { g ^ { - 1 } }$ . This shows that $\rho$ is epsilon-strongly G-graded. $( \mathrm { i i } ) { \Rightarrow } ( \mathrm { i i i } )$ : This follows from Proposition 8.

$( \mathrm { i i i } ) { \Rightarrow } ( \mathrm { i v } )$ : Suppose that (iii) holds. Let $g \in G$ and $( i , j ) \in \rho _ { g }$ . Since the grading is symmetric, $( i , j ) \in \rho _ { g } \rho _ { g ^ { - 1 } } \rho _ { g }$ . Hence there are $k , l \in \overline { { n } }$ with $( i , k ) \in \rho _ { g } , ( k , l ) \in \rho _ { q ^ { - 1 } }$ and $( l , j ) \in \rho _ { g }$ . The grading property gives $( i , l ) = ( i , k ) ( k , l ) \in \rho _ { e }$ and $( k , \bar { j } ) = ( k , l ) ( l , \bar { j } ) \in \rho _ { e }$ Since $\rho _ { e }$ is symmetric, $( l , i ) \in \rho _ { e }$ and $( j , k ) \in \rho _ { e }$ . Therefore, $( j , l ) = ( j , k ) ( k , l ) \in \rho _ { g ^ { - 1 } }$ , and hence $( j , i ) = ( j , l ) ( l , i ) \in \rho _ { g ^ { - 1 } } \rho _ { e } = \rho _ { g ^ { - 1 } }$ , where the last equality follows from Proposition $2 ( \mathrm { i i } )$ Thus $( \rho _ { g } ) ^ { - 1 } \subseteq \rho _ { g ^ { - 1 } }$ . Replacing g by $g ^ { - 1 }$ gives $( \rho _ { g ^ { - 1 } } ) ^ { - 1 } \subseteq \rho _ { g }$ . Taking inverses yields $\rho _ { g ^ { - 1 } } \subseteq$ $( \rho _ { g } ) ^ { - 1 }$ . Consequently, $( \rho _ { g } ) ^ { - 1 } = \rho _ { g ^ { - 1 } }$

[[PAGE 7]]
$( \mathrm { i v } ) { \Rightarrow } ( \mathrm { i } )$ : Suppose that (iv) holds. Then $\rho ^ { - 1 } = ( \cup _ { g \in G } \rho _ { g } ) ^ { - 1 } = \cup _ { g \in G } \left( \rho _ { g } \right) ^ { - 1 } = \cup _ { g \in G } \rho _ { g ^ { - 1 } } = \rho$ so that $\rho$ is symmetric, and hence an equivalence relation. □

## Corollary 12. Every G-grading on $\overline { { n } } ^ { 2 }$ is epsilon-strong.

Proof. Since $\overline { { n } } ^ { 2 }$ is an equivalence relation, the result follows from Proposition 11. □

The epsilon-strong gradings arising from equivalence relations need not be trivial, as the following example shows.

Example 13. There exist epsilon-strong gradings on equivalence relations that are not trivial. Indeed, let $n : = 4$ and consider the equivalence relation

$$
\rho := \{(i, j) \mid 1 \leq i, j \leq 2 \} \cup \{(i, j) \mid 3 \leq i, j \leq 4 \}.
$$

Thus the equivalence classes of $\rho$ are {1, 2} and $\{ 3 , 4 \}$ . Let $G : = \langle g \mid g ^ { 2 } = e \rangle$ be the cyclic group of order 2, and define a G-grading on $\rho$ by $\rho _ { e } : = \{ ( 1 , 1 ) , ( 2 , 2 ) , ( 3 , 3 ) , ( 4 , 4 ) \}$ and $\rho _ { g } : = \{ ( 1 , 2 ) , ( 2 , 1 ) , ( 3 , 4 ) , ( 4 , 3 ) \}$ . Since $\rho$ is an equivalence relation, Proposition 11 shows that the grading is epsilon-strong. However, it is not trivial, since $\rho _ { g } \neq \emptyset$

The situation is entirely diferent when the underlying preorder is antisymmetric.

## Proposition 14. Every epsilon-strong G-grading on a partial order on $\overline { { n } }$ is trivial.

Proof. Let $\rho$ be a partial order on n equipped with an epsilon-strong G-grading, and let $g \in G$ . Suppose that $\rho _ { g } \neq \emptyset$ , and choose $( i , j ) \in \rho _ { g }$ . By epsilon-strongness and Remark $^ { 4 , }$ $E _ { g } = \left( \rho _ { g } \rho _ { g ^ { - 1 } } \right) \cap \Delta$ with $E _ { g } ( i , j ) = ( i , j )$ . Hence, $( i , i ) \in E _ { g } \subseteq \rho _ { g } \rho _ { g ^ { - 1 } }$ , so there is some $k \in { \overline { { n } } }$ such that $( i , k ) \in \rho _ { g }$ and $( k , i ) \in \rho _ { g ^ { - 1 } }$ . In particular, $( i , k ) , ( k , i ) \in \check { \rho } .$ Since $\rho$ is antisymmetric, we obtain $i = k$ . Thus $( i , i ) \in \rho _ { g }$ . On the other hand, Proposition 2(i) gives $( i , i ) \in \Delta \subseteq \rho _ { e }$ Since the homogeneous components are pairwise disjoint, it follows that $g = e$ . Thus, $\rho _ { g } = \emptyset$ for $g \in G \backslash \{ e \}$ , and so the grading is trivial. □

## 3. Graded structural matrix rings

Throughout this section, we let R be a nonzero associative unital ring, and we denote its multiplicative identity by 1. Let $M _ { n } ( R )$ denote the ring of $n \times n$ matrices over $R .$ . For each $( i , j ) \in \overline { { n } } ^ { 2 }$ , let $e _ { i , j }$ denote the matrix having 1 in the $( i , j )$ -entry and zeros elsewhere. As in the preceding section, ρ denotes a preorder on n.

Definition 15. The structural matrix ring $M _ { n } ( \rho , R )$ induced by the relation $\rho$ is defined to be the additive subgroup $\sum _ { ( i , j ) \in \rho } R e _ { i , j }$ of $M _ { n } ( R )$ equipped with ordinary matrix multiplication.

Since $\rho$ is reflexive, $\begin{array} { r } { 1 _ { \Delta } : = \sum _ { i = 1 } ^ { n } e _ { i , i } } \end{array}$ belongs to $M _ { n } ( \rho , R )$ and is its multiplicative identity.

Proposition 16. Suppose that $\rho$ is G-graded. If we put $\begin{array} { r } { M _ { n } ( \rho , R ) _ { g } : = \sum _ { ( i , j ) \in \rho _ { g } } R e _ { i , j } } \end{array}$ for all $g \in G$ , then this defines a G-grading on $M _ { n } ( \rho , R )$

Proof. Put $S : = { \cal M } _ { n } ( \rho , R )$ , and $S _ { g } : = { \cal M } _ { n } ( \rho , R ) _ { g }$ for all $g \in G$ . Since the subsets $\rho _ { g } , g \in G$ are pairwise disjoint and their union is $\rho ,$ we have $S = \oplus _ { g \in G } S _ { g }$ as additive groups. Take

[[PAGE 8]]
$g , h \in G .$ . Then

$$
\begin{array}{r c l} {S _ {g} S _ {h}} & = & {\left(\sum_ {(i, j) \in \rho_ {g}} R e _ {i, j}\right) \left(\sum_ {(i ^ {\prime}, j ^ {\prime}) \in \rho_ {h}} R e _ {i ^ {\prime}, j ^ {\prime}}\right) = \sum_ {(i, j) \in \rho_ {g}} \sum_ {(i ^ {\prime}, j ^ {\prime}) \in \rho_ {h}} R e _ {i, j} R e _ {i ^ {\prime}, j ^ {\prime}}} \\ & = & {\sum_ {(i ^ {\prime \prime}, j ^ {\prime \prime}) \in \rho_ {g} \rho_ {h}} R e _ {i ^ {\prime \prime}, j ^ {\prime \prime}} \subseteq \sum_ {(i ^ {\prime \prime}, j ^ {\prime \prime}) \in \rho_ {g h}} R e _ {i ^ {\prime \prime}, j ^ {\prime \prime}} = S _ {g h}.} \end{array}
$$

This shows that S is a G-graded ring.

Definition 17. A G-grading on $M _ { n } ( \rho , R )$ is called very good if it is induced by a G-grading on $\rho$ as in Proposition 16.

Remark 18. (a) Suppose that $M _ { n } ( \rho , R )$ is equipped with a very good G-grading. Note that, for any $g \in G$ , we have $( i , j ) \in \rho _ { g }$ if and only if $R e _ { i , j } \subseteq M _ { n } ( \rho , R ) _ { q }$

(b) Definition 17 generalizes [10, Def. 2.1(ii)]. Indeed, if $\rho = \overline { { n } } ^ { 2 }$ , then a very good $G \mathrm { - }$ grading on $M _ { n } ( \rho , R ) = M _ { n } ( R )$ , in the sense of Definition 17, is exactly a very good G-grading on $M _ { n } ( R )$ , in the sense of [10, Def. 2.1(ii)].

For the remainder of this section, we assume that $M _ { n } ( \rho , R )$ is equipped with a very good G-grading induced by a G-grading $( \rho _ { g } ) _ { g \in G }$ on $\rho .$

Remark 19. Note that $1 _ { \Delta } \in M _ { n } ( \rho , R ) _ { e }$ . Indeed, Proposition 2(i) gives $\Delta \subseteq \rho _ { e }$ , and therefore $\begin{array} { r } { 1 _ { \Delta } = \sum _ { i = 1 } ^ { n } e _ { i , i } \in M _ { n } ( \rho , R ) _ { e } } \end{array}$ . See also [12, Prop. 1.1.1].

## Theorem 20. The following assertions hold:

(i) the G-grading on $\rho$ is trivial if and only if the induced G-grading on $M _ { n } ( \rho , R )$ is trivial;

(ii) the G-grading on ρ is symmetric if and only if the induced G-grading on $M _ { n } ( \rho , R )$ symmetric;

(iii) the G-grading on ρ is epsilon-strong if and only if the induced G-grading on $M _ { n } ( \rho , R )$ is epsilon-strong;

(iv) the G-grading on ρ is strong if and only if the induced G-grading on $M _ { n } ( \rho , R )$ is strong;

(v) if the G-grading on $\rho$ is an epsilon-crossed product, then the induced G-grading on $M _ { n } ( \rho , R )$ is an epsilon-crossed product;

(vi) if the G-grading on $\rho$ is a crossed product, then the induced G-grading on $M _ { n } ( \rho , R )$ is a crossed product.

Proof. Put $S : = { \cal M } _ { n } ( \rho , R )$ . For all $g , h \in G$ , we have

$$
S _ {g} S _ {h} = \bigoplus_ {(i, j) \in \rho_ {g} \rho_ {h}} R e _ {i, j}.\tag{2}
$$

Indeed, the inclusion from left to right follows from ordinary matrix multiplication. Conversely, if $( i , k ) \in \rho _ { g } \rho _ { h }$ , then there is some $j \in \overline { { n } }$ such that $( i , j ) \in \rho _ { g }$ and $( j , k ) \in \rho _ { h }$ . Hence, for every $r \in R , r e _ { i , k } = ( r e _ { i , j } ) e _ { j , k } \in S _ { g } S _ { h }$ . Since $R \neq \{ 0 \}$ , equality of two subgroups of the form $\oplus _ { ( i , j ) \in X } R e _ { i , j }$ is equivalent to equality of their indexing sets. It follows immediately that the grading on $\rho$ is trivial if and only if the grading on $S$ is trivial. Similarly, applying (2) twice shows that $\begin{array} { r } { S _ { g } S _ { g ^ { - 1 } } S _ { g } = \bigoplus _ { ( i , j ) \in \rho _ { g } \rho _ { a ^ { - 1 } } \rho _ { g } } R e _ { i , j } } \end{array}$ Consequently, the grading on $\rho$ is symmetric if and only if the grading on S is symmetric. Equation (2) also shows that the grading on $\rho$ is strong if and only if the grading on S is strong.

Next we consider epsilon-strongness. Suppose first that the grading on $\rho$ is epsilon-strong. By Remark 4, $E _ { g } = \rho _ { g } \rho _ { g ^ { - 1 } } \cap \Delta$ . Put $\begin{array} { r } { \epsilon _ { g } : = \sum _ { ( i , i ) \in E _ { g } } e _ { i , i } } \end{array}$ . By (2), $\epsilon _ { g } \in S _ { g } S _ { g ^ { - 1 } }$ . Moreover, $\epsilon _ { g } s = s = s \epsilon _ { g ^ { - 1 } }$ for every $s \in S _ { g }$ . Thus the grading on S is epsilon-strong.

[[PAGE 9]]
Conversely, suppose that the grading on $S$ is epsilon-strong. For every $g \in G$ , choose $\epsilon _ { g } \in S _ { g } S _ { g ^ { - 1 } }$ such that $\epsilon _ { g } s = s = s \epsilon _ { g ^ { - 1 } }$ for every $s \in S _ { g }$ . Write $\begin{array} { r } { \epsilon _ { g } = \sum _ { ( k , l ) \in \rho _ { g } \rho _ { q ^ { - 1 } } } r _ { k , l } ^ { ( g ) } e _ { k , l } . } \end{array}$ where all but finitely many coeficients are zero, and define $E _ { g } : = \{ ( i , i ) \in \Delta \ | \ r _ { i , i } ^ { ( g ) } = 1 \}$ Since $\epsilon _ { g } \in S _ { g } S _ { g ^ { - 1 } }$ , we have $E _ { g } \subseteq \left( \rho _ { g } \rho _ { g ^ { - 1 } } \right) \cap \Delta$ . Let $( i , j ) \in \rho _ { g }$ . From $\epsilon _ { g } e _ { i , j } = e _ { i , j }$ it follows that $r _ { i . i } ^ { ( g ) } = 1$ , and hence $( i , i ) \in E _ { g }$ . Similarly, from $e _ { i , j } \epsilon _ { g ^ { - 1 } } = e _ { i , j }$ it follows that $( j , j ) \in E _ { g ^ { - 1 } }$ Therefore, $E _ { g } ( i , j ) = ( i , j ) = ( i , j ) E _ { q ^ { - 1 } }$ . Thus the grading on $\rho$ is epsilon-strong.

Now suppose that the grading on $\rho$ is an epsilon-crossed product. For every $g \in G$ , choose subsets $U _ { g } \subseteq \rho _ { g }$ and $V _ { g ^ { - 1 } } \subseteq \rho _ { g ^ { - 1 } }$ such that $U _ { g } V _ { g ^ { - 1 } } = E _ { g }$ and $V _ { g ^ { - 1 } } U _ { g } = E _ { g ^ { - 1 } }$ . Put

$$
\widetilde {U} _ {g} := \{(i, j) \in U _ {g} \mid (j, i) \in V _ {g ^ {- 1}} \} \quad \text { and } \quad \widetilde {V} _ {g ^ {- 1}} := \{(j, i) \mid (i, j) \in \widetilde {U} _ {g} \}.
$$

The two displayed relation equalities imply that $\widetilde { U } _ { g }$ is the graph of a bijection between the diagonal indices occurring in $E _ { g ^ { - 1 } }$ 1 and those occurring in $E _ { g }$ . Consequently, if

$$
s _ {g} := \sum_ {(i, j) \in \widetilde {U} _ {g}} e _ {i, j} \quad \text { and } \quad t _ {g ^ {- 1}} := \sum_ {(j, i) \in \widetilde {V} _ {g ^ {- 1}}} e _ {j, i},
$$

then $\begin{array} { r } { s _ { g } t _ { g ^ { - 1 } } = \sum _ { ( i , i ) \in E _ { g } } e _ { i , i } = \epsilon _ { g } } \end{array}$ and $\begin{array} { r } { t _ { g ^ { - 1 } } s _ { g } = \sum _ { ( j , j ) \in E _ { a ^ { - 1 } } } e _ { j , j } = \epsilon _ { g ^ { - 1 } } } \end{array}$ . Hence the induced g grading on $S$ is an epsilon-crossed product.

Finally, suppose that the grading on ρ is a crossed product. The same argument applies with $E _ { g } = E _ { g ^ { - 1 } } = \Delta$ . It yields elements $u _ { g } \in S _ { g }$ and $v _ { g ^ { - 1 } } \in S _ { g ^ { - 1 } }$ such that $u _ { g } v _ { g ^ { - 1 } } = v _ { g ^ { - 1 } } u _ { g } = 1 _ { \Delta }$ Thus $u _ { g }$ is invertible in S, with inverse $v _ { g ^ { - 1 } }$ , and the induced grading is a crossed product. □

Example 21. The converses of Theorem $2 0 ( \mathrm { v } )$ and (vi) do not hold for general associative unital coeficient rings. Indeed, let K be a field, let V be a vector space over K with a countably infinite basis $v _ { 1 } , v _ { 2 } , \ldots$ , and put $R : = \operatorname { E n d } _ { K } ( V )$ . Define $a _ { 1 } , a _ { 2 } , b _ { 1 } , b _ { 2 } \in R$ by

$$
b _ {1} (v _ {m}) := v _ {2 m - 1}, \qquad b _ {2} (v _ {m}) := v _ {2 m}
$$

for every $m \geq 1$ , and

$$
a _ {1} (v _ {2 m - 1}) := v _ {m}, \qquad a _ {1} (v _ {2 m}) := 0,
$$

$$
a _ {2} (v _ {2 m}) := v _ {m}, \qquad a _ {2} (v _ {2 m - 1}) := 0.
$$

Then $a _ { i } b _ { j } = \delta _ { i , j } 1 _ { R }$ for all $i , j \in \{ 1 , 2 \}$ , and $b _ { 1 } a _ { 1 } + b _ { 2 } a _ { 2 } = 1 _ { R }$ . Let $G : = \langle g \mid g ^ { 2 } = e \rangle$ and let $\rho : = { \overline { { 3 } } } ^ { 2 }$ . Define a G-grading on $\rho$ by

$$
\rho_ {e} := \{(1, 1), (1, 2), (2, 1), (2, 2), (3, 3) \} \quad \text { and } \quad \rho_ {g} := \{(1, 3), (2, 3), (3, 1), (3, 2) \}.
$$

A direct computation gives $\rho _ { e } \rho _ { e } = \rho _ { e } , \rho _ { e } \rho _ { g } = \rho _ { g } = \rho _ { g } \rho _ { e } , \rho _ { g } \rho _ { g } = \rho _ { e }$ . Thus the grading on $\rho$ is strong. We claim that it is not an epsilon-crossed product. By Remark 4, $E _ { g } = \rho _ { g } \rho _ { g ^ { - 1 } } \cap \Delta =$ $\rho _ { e } \cap \Delta = \Delta$ . Suppose that there are subsets $U _ { g } , V _ { g } \ \subseteq \ \rho _ { g }$ such that $U _ { g } V _ { g } = \mathrm { \bar { \Delta } }$ . Since $( 1 , 1 ) \in U _ { g } V _ { g }$ , we must have $( 1 , 3 ) \in U _ { g }$ and $( 3 , 1 ) \in V _ { g }$ . Similarly, since $( 2 , 2 ) \in U _ { g } V _ { g }$ , we must have $( 2 , 3 ) \in U _ { g }$ and $( 3 , 2 ) \in V _ { g }$ . It follows that $( 1 , \overset { \cdot } { 2 } ) = ( 1 , 3 ) ( 3 , 2 ) \in U _ { g } V _ { g }$ , contradicting $U _ { g } V _ { g } = \Delta$ . Hence the grading on $\rho$ is not an epsilon-crossed product and, in particular, is not a crossed product.

Now equip $S : = M _ { 3 } ( R )$ with the very good grading induced by the above grading on $\rho .$ Consider the homogeneous element $u _ { g } : = a _ { 1 } e _ { 1 , 3 } + a _ { 2 } e _ { 2 , 3 } + b _ { 1 } e _ { 3 , 1 } + b _ { 2 } e _ { 3 , 2 } \in S _ { g }$ . Using the

[[PAGE 10]]
relations satisfied by $a _ { 1 } , a _ { 2 } , b _ { 1 } , b _ { 2 }$ , we obtain

$$
u _ {g} ^ {2} = \sum_ {i, j = 1} ^ {2} a _ {i} b _ {j} e _ {i, j} + (b _ {1} a _ {1} + b _ {2} a _ {2}) e _ {3, 3} = e _ {1, 1} + e _ {2, 2} + e _ {3, 3} = 1 _ {\Delta}.
$$

Thus $u _ { g }$ is invertible, with $u _ { g } ^ { - 1 } = u _ { g }$ . Since $1 \Delta \in S _ { e }$ is invertible, the induced grading on $S$ is a crossed product and therefore also an epsilon-crossed product.

Corollary 22. Suppose that $M _ { n } ( \rho , R )$ is equipped with a very good G-grading. Then the following assertions are equivalent:

(i) $M _ { n } ( \rho , R )$ is epsilon-strongly G-graded;

(ii) for every $g \in G$ and every $( i , j ) \in \rho _ { g }$ , we have $( i , i ) \in \rho _ { g } \rho _ { g ^ { - 1 } }$ and $( j , j ) \in \rho _ { g ^ { - 1 } } \rho _ { g }$

In that case, for each $g \in G$ , we have $\begin{array} { r } { \epsilon _ { g } = \sum _ { i \in \overline { n } , ( i , i ) \in \rho _ { g } \rho _ { g ^ { - 1 } } } e _ { i , i } . } \end{array}$

Proof. By Theorem 20, the grading on $M _ { n } ( \rho , R )$ is epsilon-strong if and only if the grading on $\rho$ is epsilon-strong.

Suppose first that the grading is epsilon-strong. By Remark 4, $E _ { g } = \rho _ { g } \rho _ { g ^ { - 1 } } \cap \Delta$ . If $( i , j ) \in \rho _ { g } .$ , then $E _ { g } ( i , j ) = ( i , j ) = ( i , j ) E _ { g ^ { - 1 } }$ , and hence $( i , i ) \in \rho _ { g } \rho _ { g ^ { - 1 } }$ and $( j , j ) \in \rho _ { g ^ { - 1 } } \rho _ { g }$ Thus (ii) holds.

Conversely, suppose that (ii) holds. For every $g \in G$ , put $E _ { g } : = \left( \rho _ { g } \rho _ { g ^ { - 1 } } \right) \cap \Delta$ . If $( i , j ) \in \rho _ { g }$ then (ii) gives $( i , i ) \in E _ { g }$ and $( j , j ) \in E _ { q ^ { - 1 } }$ . Hence $E _ { g } ( i , j ) = \left( i , j \right) = ( i , j ) E _ { g ^ { - 1 } } $ , so the grading on $\rho$ is epsilon-strong. Theorem 20 therefore shows that the grading on $\breve { M } _ { n } ( \rho , R )$ is epsilon-strong.

Finally, put $\begin{array} { r } { \epsilon _ { g } : = \sum _ { i \in \overline { n } , ( i , i ) \in \rho _ { g } \rho _ { a } - 1 } e _ { i , i } } \end{array}$ . Since $M _ { n } ( \rho , R ) _ { g } M _ { n } ( \rho , R ) _ { g ^ { - 1 } } = \bigoplus _ { ( i , j ) \in \rho _ { g } \rho _ { a ^ { - 1 } } } R e _ { i , j } { \mathrm { ! } }$ 2 we have $\epsilon _ { g } \in M _ { n } ( \rho , R ) _ { g } M _ { n } ( \rho , R ) _ { q ^ { - 1 } }$ . Assertion (ii) implies that $\epsilon _ { g } s = s = s \epsilon _ { g ^ { - 1 } }$ for every $s \in M _ { n } ( \rho , R ) _ { g }$ . Thus $\epsilon _ { g }$ is the sought unique epsilon element satisfying (1). □

Corollary 23. Suppose that $\rho$ is an equivalence relation. Then every very good G-grading on $M _ { n } ( \rho , R )$ is epsilon-strong.

Proof. Let $( \rho _ { g } ) _ { g \in G }$ be the G-grading on $\rho$ inducing the very good grading on $M _ { n } ( \rho , R )$ . Let $g \in G$ and $( i , j ) \in \rho _ { g }$ . Since $\rho$ is an equivalence relation, we have $( j , i ) \in \rho .$ . Lemma 10 therefore gives $( j , i ) \in \rho _ { g ^ { - 1 } }$ . Consequently, $( i , i ) = ( i , j ) ( j , i ) \in \rho _ { g } \rho _ { g ^ { - 1 } }$ and $( j , j ) = ( j , i ) ( i , j ) \in \rho _ { g ^ { - 1 } } \rho _ { g }$ The result now follows from Corollary 22. □

The preceding criterion also applies to preorders that are not equivalence relations.

Example 24. Consider the preorder

$$
\rho := \{(1, 1), (2, 2), (3, 3), (4, 4), (1, 2), (3, 4), (4, 3) \}
$$

on ${ \overline { { 4 } } } .$ The relation $\rho$ is not an equivalence relation, since $( 1 , 2 ) ~ \in ~ \rho$ but $( 2 , 1 ) \notin \rho$ . Let $\mathbb { Z } _ { 3 } : = \{ 0 , 1 , 2 \}$ , and define a $\mathbb { Z } _ { 3 } .$ -grading on $\rho$ by

$$
\rho_ {0} := \{(1, 1), (2, 2), (3, 3), (4, 4), (1, 2) \}, \quad \rho_ {1} := \{(3, 4) \}, \quad \rho_ {2} := \{(4, 3) \}.
$$

By Proposition 16, this grading induces a very good $\mathbb { Z } _ { 3 } – \mathrm { g r a d i n g }$ on $S : = { \cal M } _ { 4 } ( \rho , R )$ . We have $\rho _ { 0 } \rho _ { 0 } = \rho _ { 0 } , \rho _ { 1 } \rho _ { 2 } = \{ ( 3 , 3 ) \}$ and $\rho _ { 2 } \rho _ { 1 } = \{ ( 4 , 4 ) \}$ . Consequently, the condition in Corollary 22(ii) holds for every homogeneous relation $\rho _ { g }$ . Hence the induced grading on S is epsilon-strong. Its epsilon elements are $\epsilon _ { 0 } = 1 _ { \Delta } , \epsilon _ { 1 } = e _ { 3 , 3 }$ and $\epsilon _ { 2 } = e _ { 4 , 4 }$

Next, we investigate strongly graded structural matrix rings further.

[[PAGE 11]]
Theorem 25. Suppose that $M _ { n } ( \rho , R )$ is equipped with a very good strong G-grading. Then $| G | \leq n$ . Moreover, $i f \left| G \right| = n$ , then $\rho = \overline { { n } } ^ { 2 }$ , and hence $M _ { n } ( \rho , R ) = M _ { n } ( R )$

Proof. By Theorem 20, the G-grading on $\rho$ is strong. For each $g \in G$ , put

$$
J _ {g} := \left\{j \in \overline {{n}} \mid (1, j) \in \rho_ {g} \text {   and   } (j, 1) \in \rho_ {g ^ {- 1}} \right\}.
$$

Since the grading is strong, $\rho _ { g } \rho _ { g ^ { - 1 } } = \rho _ { e }$ . Moreover, $( 1 , 1 ) \in \Delta \subseteq \rho _ { e }$ . Hence $( 1 , 1 ) \in \rho _ { g } \rho _ { g ^ { - 1 } }$ so there is some $j \in \overline { { n } }$ such that $( 1 , j ) \in \rho _ { g }$ and $( j , 1 ) \in \rho _ { g ^ { - 1 } }$ Thus $J _ { g } \ \ne \ \emptyset$ for every $g \in G$ . We claim that the sets $J _ { g } , g \in G$ , are pairwise disjoint. Indeed, if $j \in J _ { g } \cap J _ { h }$ , then $( 1 , j ) \in \rho _ { g } \cap \rho _ { h }$ . Since the homogeneous components of $\rho$ are pairwise disjoint, it follows that $g = h$ . Thus $( J _ { g } ) _ { g \in G }$ is a family of pairwise disjoint nonempty subsets of the n-element set n. Consequently, $| G | \leq n$ . Suppose now that $| G | = n$ . Since the sets $J _ { g } , g \in G$ , are pairwise disjoint and nonempty, their union is n. Hence, for every $j \in \overline { { n } }$ , there is some $g \in G$ such that $j \in J _ { g }$ . In particular, $( 1 , j ) \in \rho$ and $( j , 1 ) \in \rho$ . Therefore, for arbitrary $i , j \in \pi$ , transitivity of $\rho$ gives $( i , j ) = ( i , 1 ) ( 1 , j ) \in \rho$ . Thus $\rho = \overline { { n } } ^ { 2 }$ , and consequently $M _ { n } ( \rho , R ) = M _ { n } ( R )$ □

## 4. Very good gradings and partial actions

A very good G-grading on $M _ { n } ( \rho , R )$ is determined by a G-grading $( \rho _ { g } ) _ { g \in G }$ on the preorder $\rho .$ In this section, we consider the case where $\rho$ is an equivalence relation and the neutral component of the induced ring grading consists precisely of the diagonal matrices. We show that, under these assumptions, each relation $\rho _ { g }$ is the graph of a partial bijection and that these partial bijections form a free partial action of $G$ on n whose orbit equivalence relation is $\rho .$ Conversely, every such partial action induces a very good G-grading on $M _ { n } ( \rho , R )$ . This yields a bijective correspondence between the two types of structures.

Definition 26. A partial action of G on a set X is a family $\alpha = ( X _ { g } , \alpha _ { g } ) _ { g \in G }$ , where $X _ { g } \subseteq X$ and $\alpha _ { g } : X _ { g ^ { - 1 } } \to X _ { g }$ is a bijection for every $g \in G$ , such that the following assertions hold:

$( \mathrm { P 1 } ) \ X _ { e } = X$ and $\alpha _ { e } = \operatorname { i d } _ { X }$ ;

(P2) if $g , h \in G , x \in X _ { h ^ { - 1 } }$ , and $\alpha _ { h } ( x ) \in X _ { q ^ { - 1 } }$ , then $x \in X _ { ( g h ) ^ { - 1 } }$ and $\alpha _ { g h } ( x ) = \alpha _ { g } ( \alpha _ { h } ( x ) )$ The partial action is called global if $X _ { g } = X$ for every $g \in G$ . It is called free if, whenever $x \in X _ { q ^ { - 1 } } \cap X _ { h ^ { - 1 } }$ and $\alpha _ { g } ( x ) = \alpha _ { h } ( x )$ , one has $g = h$ The orbit equivalence relation $\sim _ { \alpha }$ induced by α is defined by $i \sim _ { \alpha } j \Leftrightarrow \alpha _ { q } ( j ) = i$ for some $g \in G$ with $j \in X _ { g ^ { - 1 } }$ . The partial action is called transitive if $i \sim _ { \alpha j }$ for all $i , j \in X$

The orbit relation induced by any partial action is an equivalence relation. Thus, if a G-grading on a preorder $\rho$ is to be described by a partial action whose orbit relation is $\rho ,$ it is necessary to assume that $\rho$ is an equivalence relation. For the remainder of this section, we therefore assume that $\rho$ is an equivalence relation on n. We put $S : = { \cal M } _ { n } ( \rho , R )$ and $D : = \bigoplus _ { i = 1 } ^ { n } R e _ { i , i }$

Definition 27. We denote by $\mathcal { G } ( \rho , G , R )$ the set of all very good G-gradings $\boldsymbol { S } = ( S _ { g } ) _ { g \in \boldsymbol { G } }$ on S such that $S _ { e } = D$ . We also denote by $A ( \rho , G )$ the set of all free partial actions of G on n whose orbit equivalence relation is $\rho .$

Definition 28. Let $ { \boldsymbol { S } } = (  { \boldsymbol { S } } _ { g } ) _ { g \in G } \in \mathcal { G } ( \rho , G , R )$ . Take $g \in G$ . Put

ρ<sup>S</sup><sub>g</sub> := {(i, j) ∈ ρ | e<sub>i,j</sub> ∈ S<sub>g</sub>}, and $X _ { g } ^ { \mathcal { S } } : = \{ i \in \overline { { n } } \mid ( i , j ) \in \rho _ { g } ^ { S }$ for some $j \in \overline { { n } } \}$

Consider the rule $\alpha _ { g } ^ { S } ( j ) = i \Leftrightarrow ( i , j ) \in \rho _ { g } ^ { S }$ , where $j \in X _ { g ^ { - 1 } } ^ { S }$ and $i \in X _ { g } ^ { S }$ . We then write $\alpha ^ { S } : = \big ( X _ { g } ^ { \mathcal { S } } , \alpha _ { g } ^ { \mathcal { S } } \big ) _ { g \in G }$ and define $\Phi ( S ) : = \alpha ^ { S }$

[[PAGE 12]]
## Lemma 29. The map $\Phi : { \mathcal { G } } ( \rho , G , R ) \to A ( \rho , G )$ is well defined.

Proof. Let $ { \boldsymbol { S } } = (  { \boldsymbol { S } } _ { g } ) _ { g \in G } \in \mathcal { G } ( \rho , G , R )$ . Since S is a very good grading, the family $\left( \rho _ { g } ^ { S } \right) _ { g \in G }$ is a G-grading on $\rho .$ . Moreover, the equality $S _ { e } = D$ implies that $\rho _ { e } ^ { S } = \Delta$ . Since $\rho$ is an equivalence relation, Proposition 11 gives $\left( \rho _ { g } ^ { S } \right) ^ { - 1 } = \rho _ { g ^ { - 1 } } ^ { S }$ for every $g \in G$ . We first show that $\alpha _ { g } ^ { S } : X _ { g ^ { - 1 } } ^ { S }  X _ { g } ^ { S }$ is a well-defined bijection. Let $j \in \mathop { X } _ { g ^ { - 1 } } ^ { \mathcal { S } }$ . By the definition of $X _ { g ^ { - 1 } } ^ { S }$ , there is some $i \in \overline { { n } }$ with $( j , i ) \in \rho _ { g ^ { - 1 } } ^ { S }$ . It follows from $\left( \rho _ { g } ^ { S } \right) ^ { - 1 } = \rho _ { g ^ { - 1 } } ^ { S }$ that $( i , j ) \in \rho _ { g } ^ { S }$ . In particular, $i \in X _ { g } ^ { S }$ . This element i is unique. Indeed, suppose that $( i , j ) , ( i ^ { \prime } , j ) \in \rho _ { g } ^ { S }$ . By $\left( \rho _ { g } ^ { S } \right) ^ { - 1 } = \rho _ { g ^ { - 1 } } ^ { S }$ we have $( j , i ^ { \prime } ) \in \rho _ { g ^ { - 1 } } ^ { S }$ . Therefore, $( i , i ^ { \prime } ) = ( i , j ) ( j , i ^ { \prime } ) \in \rho _ { g } ^ { S } \rho _ { a ^ { - 1 } } ^ { S } \subseteq \rho _ { e } ^ { S } = \Delta$ . Consequently, $i = i ^ { \prime } ,$ and hence $\alpha _ { g } ^ { S }$ is well defined. The relation $\left( \rho _ { g } ^ { S } \right) ^ { - 1 } = \bar { \rho } _ { g ^ { - 1 } } ^ { S }$ also shows that $\alpha _ { g ^ { - 1 } } ^ { S }$ is the inverse of $\alpha _ { g } ^ { S }$ . Thus $\alpha _ { g } ^ { S } : X _ { q ^ { - 1 } } ^ { S }  X _ { g } ^ { S }$ is a bijection.

Since $\rho _ { e } ^ { S } = \Delta$ , we have ${ \dot { X } } _ { e } ^ { S } = { \overline { { n } } }$ and $\alpha _ { e } ^ { S } = \operatorname { i d } _ { \overline { { n } } } .$

Now let $g , h \in G .$ , and suppose that $j \in X _ { h ^ { - 1 } } ^ { S }$ and $\alpha _ { h } ^ { S } ( j ) \in X _ { q ^ { - 1 } } ^ { S }$ . Put $l : = \alpha _ { h } ^ { S } ( j )$ and $i : = \alpha _ { q } ^ { S } ( l )$ . Then $( i , l ) \in \rho _ { g } ^ { S }$ and $( l , j ) \in \rho _ { h } ^ { S }$ . It follows that $( i , j ) \in \rho _ { g } ^ { \check { S } } \rho _ { h } ^ { S } \subseteq \rho _ { g h } ^ { S }$ . Consequently, $\alpha _ { g h } ^ { S } ( j ) = i = \alpha _ { g } ^ { S } \big ( \alpha _ { h } ^ { S } ( j ) \big )$ . Thus $\alpha ^ { S }$ is a partial action of G on n.

We now show that this partial action is free. Let $j \in X _ { q ^ { - 1 } } ^ { \mathcal { S } } \cap X _ { h ^ { - } } ^ { \mathcal { S } }$ <sub>1</sub> and $\alpha _ { g } ^ { S } ( j ) = \alpha _ { h } ^ { S } ( j ) = i$ Then $( i , j ) \in \rho _ { g } ^ { S } \cap \rho _ { h } ^ { S }$ . Since the sets $\rho _ { g } ^ { S } , g \in G$ , are pairwise disjoint, it follows that $g = h$

Finally, for $i , j \in \overline { { n } }$ , we have $( i , j ) \in \breve { \rho } \Leftrightarrow ( i , j ) \in \rho _ { q } ^ { S }$ for some $g \in G \Leftrightarrow \alpha _ { q } ^ { S } ( j ) = i$ for some $g \in G$ . Consequently, the orbit equivalence relation of $\alpha ^ { S }$ is $\rho .$ . Thus $\alpha ^ { S } \in { \bar { \mathcal { A } } } ( \rho , G )$ , and hence Φ is well defined. □

Definition 30. Let $\alpha = ( X _ { g } , \alpha _ { g } ) _ { g \in G } \in \mathcal { A } ( \rho , G )$ . For every $g \in G$ , put

$$
\rho_ {g} ^ {\alpha} := \left\{\left(\alpha_ {g} (j), j\right) \mid j \in X _ {g ^ {- 1}} \right\} \quad \text { and } \quad S _ {g} ^ {\alpha} := \bigoplus_ {j \in X _ {g ^ {- 1}}} R e _ {\alpha_ {g} (j), j}.
$$

We write $S ^ { \alpha } : = ( S _ { g } ^ { \alpha } ) _ { g \in G }$ and define $\Psi ( \alpha ) : = \mathcal { S } ^ { \alpha }$

## Lemma 31. The map $\Psi : { \mathcal { A } } ( \rho , G ) \to { \mathcal { G } } ( \rho , G , R )$ is well defined.

Proof. Let $\alpha = ( X _ { g } , \alpha _ { g } ) _ { g \in G } \in \mathcal { A } ( \rho , G )$ . We first show that $( \rho _ { g } ^ { \alpha } ) _ { g \in G }$ is a G-grading on $\rho .$ Since the orbit equivalence relation of α is $\rho ,$ we have $\begin{array} { r } { \rho = \bigcup _ { q \in G } \hat { \rho _ { g } ^ { \alpha } } } \end{array}$ . Let $( i , j ) \in \rho _ { g } ^ { \alpha } \cap \rho _ { h } ^ { \alpha }$ . Then $\alpha _ { g } ( j ) = i = \alpha _ { h } ( j )$ . Since α is free, it follows that $g = h$ . Thus the sets $\rho _ { g } ^ { \alpha } , g \in G ,$ are pairwise disjoint. It remains to verify compatibility with composition. Suppose that $( i , l ) \in \rho _ { g } ^ { \alpha }$ and $( l , j ) \in \rho _ { h } ^ { \alpha }$ Then $i = \alpha _ { g } ( l )$ and $l = \alpha _ { h } ( j )$ . In particular, $\alpha _ { g } ( \alpha _ { h } ( j ) )$ ) is defined. By the partial action identit $\mathrm { y } , i = \alpha _ { g } ( \alpha _ { h } ( j ) ) = \alpha _ { g h } ( j )$ . Hence $( i , j ) \in \overset { \cdot } { \rho } _ { g h } ^ { \alpha }$ . Therefore, $\rho _ { g } ^ { \alpha } \rho _ { h } ^ { \alpha } \subseteq \rho _ { g h } ^ { \alpha }$ Consequently, $( \rho _ { g } ^ { \alpha } ) _ { g \in G }$ is a G-grading on ρ. By Proposition 16, this G-grading on ρ induces the very good G-grading $( S _ { g } ^ { \alpha } ) _ { g \in G }$ on S from Definition 30. Finally, since $X _ { e } = \overline { { n } }$ and $\alpha _ { e } = \mathrm { i d } _ { \overline { { n } } }$ , we have $\rho _ { e } ^ { \alpha } = \{ ( i , i ) \mid i \in \bar { n } \} = \Delta$ . It follows that $S _ { e } ^ { \alpha } = \oplus _ { i = 1 } ^ { n } R e _ { i , i } = D$ . Thus $S ^ { \alpha } \in { \mathcal { G } } ( \rho , G , R )$ , and hence Ψ is well defined. □

## Theorem 32. The maps Φ and Ψ are mutually inverse.

Proof. Let $ { \boldsymbol { S } } = (  { \boldsymbol { S } } _ { q } ) _ { q \in G } \in \mathcal { G } ( \rho , G , R )$ , and let $( \rho _ { g } ^ { S } ) _ { g \in G }$ be the associated G-grading on $\rho .$ By the definitions of Φ and Ψ, the degree-g relation associated to $\Psi ( \Phi ( S ) )$ is

$$
\left\{\left(\alpha_ {g} ^ {\mathcal {S}} (j), j\right) \mid j \in X _ {g ^ {- 1}} ^ {\mathcal {S}} \right\} = \rho_ {g} ^ {\mathcal {S}}.
$$

[[PAGE 13]]
Thus the degree-g component of $\Psi ( \Phi ( S ) )$ is $S _ { g }$ for every $g \in G$ . Hence, $\Psi \circ \Phi = \operatorname { i d } _ { \mathcal { G } ( \rho , G , R ) }$ Conversely, let $\alpha = ( X _ { g } , \alpha _ { g } ) _ { g \in G } \in \mathcal { A } ( \rho , G )$ . The degree-g relation associated to $\Psi ( \alpha )$ is $\rho _ { g } ^ { \alpha } = \{ ( \alpha _ { g } ( j ) , j ) \mid j \in X _ { g ^ { - 1 } } \}$ . The set of first coordinates occurring in $\rho _ { g } ^ { \alpha }$ is $\alpha _ { g } ( X _ { g ^ { - 1 } } ) = X _ { g }$ Moreover, the partial bijection recovered from $\rho _ { g } ^ { \alpha }$ is the map $j \mapsto \alpha _ { g } ( \bar { j } ) , j \in \dot { X _ { g ^ { - 1 } } }$ Thus the construction in Lemma 29 recovers both $X _ { g }$ and $\alpha _ { g }$ for every $g \in G$ . Consequently, $\Phi ( \Psi ( { \boldsymbol { \alpha } } ) ) = { \boldsymbol { \alpha } }$ . Hence $\Phi \circ \Psi = \operatorname { i d } _ { \mathcal { A } ( \rho , G ) }$ . Therefore, Φ and Ψ are mutually inverse. □

Corollary 33. Let G be a finite group, and let $C _ { 1 } , \ldots , C _ { k }$ be the equivalence classes of $\rho .$ The following two assertions are equivalent:

(i) $A ( \rho , G )$ is nonempty;

(ii) $| C _ { i } | \leq | G |$ for every $i \in \{ 1 , \ldots , k \}$

Whenever these two equivalent assertions hold true, we have

$$
| \mathcal {A} (\rho , G) | = \prod_ {i = 1} ^ {k} \frac {(| G | - 1) !}{(| G | - | C _ {i} |) !}.
$$

Proof. For every $i \in \{ 1 , \ldots , k \}$ , choose some $m _ { i } \in C _ { i }$ . By Theorem 32, it sufices to count the maps $f \colon \rho \to G$ satisfying $f ( x , y ) f ( y , z ) = f ( x , z )$ for $( x , y ) , ( y , z ) \in \rho .$ , and $f ^ { - 1 } ( e ) = \Delta$ For $i \in \{ 1 , \ldots , k \}$ , define $a _ { i } : C _ { i } \to G$ by $a _ { i } ( x ) : = f ( m _ { i } , x )$ for $x \in C _ { i }$ Then, for all $i \in \{ 1 , \ldots , k \}$ and $x , y \in C _ { i }$ , we have $a _ { i } ( m _ { i } ) = e$ and $f ( x , y ) = a _ { i } ( x ) ^ { - 1 } a _ { i } ( y )$ . Consequently, $f ^ { - 1 } ( e ) = \Delta$ if and only if every $a _ { i }$ is injective.

Conversely, given injections $a _ { i } : C _ { i } \hookrightarrow G$ satisfying $a _ { i } ( m _ { i } ) = e$ for every $i ,$ define $f ( x , y ) : =$ $a _ { i } ( x ) ^ { - 1 } a _ { i } ( y )$ whenever $x , y \in C _ { i }$ . Injectivity gives $f ( x , y ) = e$ if and only if $x = y$ . Hence there is a bijection between ${ \mathcal { A } } ( \rho , G )$ and $\begin{array} { r } { \prod _ { i = 1 } ^ { k } \big \{ a _ { i } \colon C _ { i } \hookrightarrow G \mid a _ { i } ( m _ { i } ) = e \big \} } \end{array}$

For each i, the set $\{ a _ { i } \colon C _ { i } \hookrightarrow G \mid a _ { i } ( m _ { i } ) = e \}$ is nonempty exactly when $\left| C _ { i } \right| \leq \left| G \right|$

Suppose that ${ \mathcal { A } } ( \rho , G )$ is nonempty. The number of choices for $a _ { i }$ is

$$
\frac {(| G | - 1) !}{(| G | - | C _ {i} |) !}.
$$

Multiplying over the equivalence classes proves the desired equality.

The equivalence relation hypothesis in Theorem 32 is essential. If $\rho$ is merely a preorder, a homogeneous component of a very good grading need not be the graph of a partial function, even when the neutral component consists precisely of the diagonal matrices, as the following example shows.

Example 34. Let $G : = \mathbb { Z } _ { 2 } = \{ e , g \}$ , and consider the preorder $\rho : = \Delta \cup \{ ( 1 , 3 ) , ( 2 , 3 ) \}$ on ${ \overline { { 3 } } } .$ Define a G-grading on ρ by $\rho _ { e } : = \Delta$ and $\rho _ { g } : = \{ ( 1 , 3 ) , ( 2 , 3 ) \}$ . This grading induces a very good G-grading on $M _ { 3 } ( \rho , R )$ whose neutral component is $D = \oplus _ { i = 1 } ^ { 3 } R e _ { i , i }$ . However, $\rho _ { g }$ is not the graph of a partial function on 3. Under the convention used above, the relation $\rho _ { g }$ would require simultaneously $\alpha _ { g } ( 3 ) = 1$ and $\alpha _ { g } ( 3 ) = 2$ . Consequently, this very good grading cannot be encoded by a partial action of G on 3 in the manner described above.

Corollary 35. Suppose that $\rho$ is an equivalence relation on n and that $( S _ { g } ) _ { g \in G }$ is a very good G-grading on $M _ { n } ( \rho , R )$ with $S _ { e } = D = \oplus _ { i = 1 } ^ { n } R e _ { i , i }$ . Then the G-graded ring $M _ { n } ( \rho , R )$ is an epsilon-crossed product.

Proof. Let $ { \boldsymbol { S } } = (  { \boldsymbol { S } } _ { g } ) _ { g \in G } \in \mathcal { G } ( \rho , G , R )$ , and let $\alpha = ( X _ { g } , \alpha _ { g } ) _ { g \in G }$ be the corresponding free partial action under Theorem 32. For every $g \in G$ , put $\begin{array} { r } { u _ { g } : = \sum _ { j \in X _ { q ^ { - 1 } } } e _ { \alpha _ { g } ( j ) , j } \in S _ { g } } \end{array}$ and $\begin{array} { r } { \boldsymbol { v } _ { g ^ { - 1 } } : = \sum _ { i \in { \boldsymbol { X } } _ { g } } \boldsymbol { e } _ { \alpha _ { q ^ { - 1 } } ( i ) , i } \in \boldsymbol { S } _ { g ^ { - 1 } } } \end{array}$ . Note that, by Corollaries 22–23, $\begin{array} { r } { \epsilon _ { g } = \sum _ { i \in \overline { { n } } , ( i , i ) \in \rho _ { g } \rho _ { q ^ { - 1 } } } e _ { i , i } . } \end{array}$ Hence $\begin{array} { r } { u _ { g } v _ { g ^ { - 1 } } = \sum _ { i \in X _ { q } } e _ { i , i } = \epsilon _ { g } } \end{array}$ and $\begin{array} { r } { v _ { g ^ { - 1 } } u _ { g } = \sum _ { j \in X _ { a ^ { - 1 } } } e _ { j , j } = \epsilon _ { g ^ { - 1 } } } \end{array}$ . Thus $\boldsymbol { s }$ is an epsiloncrossed product. □

[[PAGE 14]]
We next specialize Theorem 32 to full matrix rings. Recall that a very good G-grading on $M _ { n } ( \rho , R )$ is called elementary if it is induced by an n-tuple $( g _ { 1 } , \ldots , g _ { n } ) \in G ^ { n }$ in the sense that de $\mathfrak { g } ( e _ { i , j } ) = g _ { i } g _ { j } ^ { - 1 }$ whenever $( i , j ) \in \rho$ . It is called strictly elementary if the elements $g _ { 1 } , \ldots , g _ { n }$ are pairwise distinct.

Corollary 36. Under the correspondence in Theorem 32, the strictly elementary G-gradings on $M _ { n } ( R )$ correspond precisely to the free and transitive partial actions of G on n.

Proof. Let $M _ { n } ( R ) = \bigoplus _ { q \in G } S _ { g }$ be a strictly elementary grading induced by $( g _ { 1 } , \ldots , g _ { n } )$ . Then $\deg ( e _ { i , j } ) = e \Leftrightarrow g _ { i } = g _ { j } \Leftrightarrow i = j$ . Hence $S _ { e } = D$ . Since the underlying equivalence relation of $M _ { n } ( R )$ is $\overline { { n } } \times \overline { { n } } .$ , its corresponding partial action has only one orbit and is therefore transitive. Conversely, suppose that a very good grading on $M _ { n } ( R )$ satisfies $S _ { e } ~ = ~ D$ . Put $g _ { i } : =$ $\deg ( e _ { i , 1 } ) , \ i \in \overline { { n } }$ . Since $e _ { i , j } = e _ { i , 1 } e _ { 1 , j }$ and $\mathrm { d e g } ( e _ { 1 , j } ) = g _ { j } ^ { - 1 }$ , we obtain $\mathrm { d e g } ( e _ { i , j } ) = g _ { i } g _ { j } ^ { - 1 }$ . If $g _ { i } = g _ { j }$ , then $e _ { i , j } \in S _ { e } = D$ , and hence $i = j$ . Thus the grading is strictly elementary. Tk T 22 口

The result now follows from Theorem 32.

Remark 37. For an equivalence relation with more than one equivalence class, the condition $S _ { e } = D$ need not imply that the grading can be induced by a single injective n-tuple in G. Thus, in Theorem 32, the natural general condition is $S _ { e } = D$ , whereas strict elementarity is recovered in the full matrix case by Corollary 36.

The strong-grading condition has a particularly simple interpretation.

Corollary 38. Under the correspondence in Theorem 32, the G-grading on $M _ { n } ( \rho , R )$ is strong if and only if the corresponding partial action is global.

Proof. Let $\alpha = ( X _ { g } , \alpha _ { g } ) _ { g \in G }$ be the partial action corresponding to the very good grading $\boldsymbol { S } = ( S _ { g } ) _ { g \in \boldsymbol { G } }$ , and let $( \rho _ { g } ) _ { g \in G }$ be the associated G-grading on $\rho .$ . Since $\rho$ is an equivalence relation, Corollary 23 shows that S is epsilon-strongly G-graded.

As observed in the proof of Corollary 35, we have $\begin{array} { r } { \epsilon _ { g } = \sum _ { i \in X _ { a } } e _ { i i } } \end{array}$ for each $g \in G$ . Therefore, an epsilon-strong grading is strong $\Leftrightarrow \epsilon _ { g } = 1 _ { \Delta }$ for each $g \in { \dot { G } } \Leftrightarrow X _ { g } = { \overline { { n } } }$ for each $g \in G \Leftrightarrow$ the partial action α is global. □

Corollary 39. Under the correspondence in Theorem 32, a strictly elementary G-grading on $M _ { n } ( R )$ is strong if and only if the corresponding partial action is global. Consequently, $M _ { n } ( R )$ admits a strong strictly elementary G-grading if and only $i f \left| G \right| = n$ . In that case, the corresponding action is equivalent to the regular action of G on itself.

Proof. By Corollary 36, a partial action corresponding to a strictly elementary grading on $M _ { n } ( R )$ is free and transitive. By Corollary 38, a G-grading is strong if and only if this partial action is global. A free and transitive global action of $G$ on n is regular, and therefore $| G | = n$ . Conversely, if $| G | = n$ , then, after identifying n with G, the regular action of G on itself corresponds to a strong strictly elementary G-grading on $M _ { n } ( R )$ □

Example 40. Write $C _ { 6 } : = \mathbb { Z } / 6 \mathbb { Z }$ additively, and put $X : = \{ 1 , 2 , 3 , 4 \} \subseteq C _ { 6 }$ . Restrict the translation action of $C _ { 6 }$ on itself to X. More precisely, for $g \in C _ { 6 } ,$ put $X _ { g } : = X \cap ( g + X )$ and define $\alpha _ { g } : X _ { - g }  X _ { g }$ by $\alpha _ { g } ( x ) : = g + x$ , for $x \in X _ { - g }$ . This is a free and transitive partial action of $C _ { 6 }$ on X. Under the identification $X = { \overline { { 4 } } }$ , the corresponding strictly elementary grading on $S : = M _ { 4 } ( R )$ is induced by the tuple $( 1 , 2 , 3 , 4 )$ and is given by $S _ { 0 } = \oplus _ { i = 1 } ^ { 4 } R e _ { i , i } .$ $S _ { 1 } = R e _ { 2 , 1 } \oplus R e _ { 3 , 2 } \oplus R e _ { 4 , 3 } , S _ { 2 } = R e _ { 3 , 1 } \oplus R e _ { 4 , 2 } , S _ { 3 } = R e _ { 1 , 4 } \oplus R e _ { 4 , 1 } , S _ { 4 } = R e _ { 1 , 3 } \oplus R e _ { 2 , 4 }$ ${ S _ { 5 } = R e _ { 1 , 2 } \oplus R e _ { 2 , 3 } \oplus R e _ { 3 , 4 } }$ . The partial action is not global, and hence the grading is not strong by Corollary 38. It is, however, an epsilon-crossed product by Corollary 35.

[[PAGE 15]]
Let $S , S ^ { \prime }$ be G-graded rings with gradings $( S _ { g } ) _ { g \in G }$ and $( S _ { g } ^ { \prime } ) _ { g \in G }$ . Recall that S and $S ^ { \prime }$ , and their gradings, are said to be graded isomorphic if there is a ring isomorphism $\phi : S  S ^ { \prime }$ such that $\phi ( S _ { g } ) = S _ { q } ^ { \prime }$ for every $g \in G$ . In that case, ϕ is referred to as a graded isomorphism.

We finish this section by, in the case where R is a field, classifying the gradings in Theorem 32 up to graded isomorphism.

Definition 41. Two partial actions $\alpha = ( X _ { g } , \alpha _ { g } ) _ { g \in G }$ and $\beta = ( Y _ { g } , \beta _ { g } ) _ { g \in G }$ of $G$ on sets X and $Y .$ , respectively, are called equivalent if there is a bijection $\sigma : X  Y$ with $\sigma ( X _ { g } ) = Y _ { g }$ and $\sigma ( \alpha _ { g } ( x ) ) = \beta _ { g } ( \sigma ( x ) )$ for all $g \in G$ and $x \in X _ { g ^ { - 1 } }$

Theorem 42. Let K be a field, let ρ be an equivalence relation on ${ \overline { { n } } } ,$ and put $S : = { \cal M } _ { n } ( \rho , K )$ and $D : = \oplus _ { i = 1 } ^ { n } K e _ { i , i }$ . The bijection in Theorem 32 induces a bijection between the set of graded K-algebra isomorphism classes of very good G-gradings on S with $S _ { e } = D$ , and the set of equivalence classes of free partial actions of G on n whose orbit equivalence relation is $\rho .$

Proof. Let $\alpha = ( X _ { g } , \alpha _ { g } ) _ { g \in G }$ and $\beta = ( Y _ { g } , \beta _ { g } ) _ { g \in G }$ be equivalent partial actions, and let $\sigma : \overline { { n } } $ n be an equivalence between them. Since both orbit equivalence relations are $\rho ,$ the bijection σ is an automorphism of the relation $\rho .$ Hence the K-linear map $\Phi _ { \sigma } : S  S$ , defined by $\Phi _ { \sigma } ( e _ { i , j } ) : = e _ { \sigma ( i ) , \sigma ( j ) } :$ , is a K-algebra automorphism. If $( i , j ) \in \rho _ { g }$ for the grading associated to α, then $i = \alpha _ { g } ( j )$ , and therefore $\sigma ( i ) = \sigma ( \alpha _ { g } ( j ) ) = \beta _ { g } ( \sigma ( j ) )$ . Thus $( \sigma ( i ) , \sigma ( j ) )$ belongs to the degree-g part of the grading associated to $\beta .$ Consequently, $\Phi _ { \sigma }$ is a graded isomorphism.

Conversely, let $( S _ { g } ) _ { g \in G }$ and $( S _ { q } ^ { \prime } ) _ { g \in G }$ be two very good G-gradings on S satisfying $S _ { e } = S _ { e } ^ { \prime } =$ $D$ , and suppose that $\Phi : ( S , ( \bar { S _ { g } } ) _ { g \in G } )  ( S , ( S _ { q } ^ { \prime } ) _ { g \in G } )$ is a graded K-algebra isomorphism. Since $\Phi ( D ) = D$ and $D \cong K ^ { n }$ , the restriction of Φ to D permutes the primitive idempotents of D. Thus there is a permutation $\sigma$ of n with $\Phi ( e _ { i , i } ) = e _ { \sigma ( i ) , \sigma ( i ) }$ for every $i \in \overline { { n } }$

Take $( i , j ) \in \rho .$ . Then $0 \neq \Phi ( e _ { i , j } ) = \Phi ( e _ { i , i } e _ { i , j } e _ { j , j } ) = e _ { \sigma ( i ) , \sigma ( i ) } \Phi ( e _ { i , j } ) e _ { \sigma ( j ) , \sigma ( j ) }$ . It follows that $( \sigma ( i ) , \sigma ( j ) ) \in \rho$ and that $\Phi ( e _ { i , j } ) = \lambda _ { i , j } e _ { \sigma ( i ) , \sigma ( j ) }$ for some $\lambda _ { i , j } \in K \setminus \{ 0 \}$ . Applying the same argument to $\Phi ^ { - 1 }$ shows that σ is an automorphism of $\rho .$

Let α and $\beta$ be the partial actions corresponding to the two gradings. If $j \in X _ { g ^ { - 1 } }$ and $\alpha _ { g } ( j ) = i$ , then $e _ { i , j } \in S _ { g }$ . Since Φ is graded, $\Phi ( e _ { i , j } ) = \lambda _ { i , j } e _ { \sigma ( i ) , \sigma ( j ) }$ gives $e _ { \sigma ( i ) , \sigma ( j ) } \in S _ { g } ^ { \prime }$ . Hence $\beta _ { g } ( \sigma ( j ) ) = \sigma ( i ) = \sigma ( \alpha _ { g } ( j ) )$ . It also follows that $\sigma ( X _ { g ^ { - 1 } } ) = Y _ { g ^ { - 1 } }$ for every $g \in G$ . Thus $\sigma$ is an equivalence between α and $\beta .$ □

Corollary 43. Let K be a field. The correspondence in Theorem 32 induces a bijection between the set of graded K-algebra isomorphism classes of strictly elementary G-gradings on $M _ { n } ( K )$ and the set of equivalence classes of free and transitive partial actions of G on n.

Proof. This follows from Corollary 36 and Theorem 42, applied to $\rho = { \overline { { n } } } \times { \overline { { n } } } .$

## References

[1] Y. A. Bahturin, S. K. Sehgal and M. V. Zaicev, Group gradings on associative algebras, J. Algebra 241 (2001), no. 2, 677–698.

[2] F. Be¸sleag˘a and S. D˘asc˘alescu, Structural matrix algebras, generalized flags and gradings, Trans. Amer. Math. Soc. 373 (2020), no. 10, 6863–6885.

[[PAGE 16]]
[3] F. Be¸sleag˘a, S. D˘asc˘alescu and L. van Wyk, Classifying good gradings on structural matrix algebras, Linear Multilinear Algebra 67 (2019), no. 10, 1948–1957.

[4] S. Caenepeel, S. D˘asc˘alescu and C. N˘ast˘asescu, On gradings of matrix algebras and descent theory, Comm. Algebra 30 (2002), no. 12, 5901–5920.

[5] S. P. Coelho, Automorphism groups of certain structural matrix rings, Comm. Algebra 22 (1994), no. 14, 5567–5586.

[6] S. D˘asc˘alescu, B. Ion, C. N˘ast˘asescu and J. Rios Montes, Group gradings on full matrix rings, J. Algebra 220 (1999), no. 2, 709–728.

[7] S. D˘asc˘alescu and L. van Wyk, Do isomorphic structural matrix rings have isomorphic graphs?, Proc. Amer. Math. Soc. 124 (1996), no. 5, 1385–1391.

[8] J. Dewitt and K. L. Price, Induced good gradings of structural matrix rings, Comm. Algebra 47 (2019), no. 3, 1114–1124.

[9] A. V. Kelarev and O. V. Sokratova, Information rates and weights of codes in structural matrix rings, in Applied Algebra, Algebraic Algorithms and Error-Correcting Codes, Lecture Notes in Comput. Sci., Vol. 2227, Springer-Verlag, Berlin, 2001, pp. 151–158.

[10] P. Lundstr¨om, J. Oinert, L. Orozco and H. Pinedo, Very good gradings on matrix rings are epsilon-strong,<sup>¨</sup> Linear Multilinear Algebra 73 (2025), no. 1, 40–48.

[11] B. Mitchell, Theory of Categories, Academic Press, New York, 1965.

[12] C. N˘ast˘asescu and F. van Oystaeyen, Methods of Graded Rings, Lecture Notes in Mathematics, Vol. 1836, Springer-Verlag, Berlin, 2004.

[13] P. Nystedt, J. Oinert and H. Pinedo, Epsilon-strongly graded rings, separability and semisimplicity, <sup>¨</sup> J. Algebra 514 (2018), 1–24.

[14] G.-C. Rota, On the foundations of combinatorial theory. I. Theory of M¨obius functions, Z. Wahrscheinlichkeitstheorie Verw. Geb. 2 (1964), 340–368.

[15] A. D. Sands, Radicals of structural matrix rings, Quaest. Math. 13 (1990), no. 1, 77–81.

[16] L. van Wyk, Maximal left ideals in structural matrix rings, Comm. Algebra 16 (1988), 399–419.

Department of Engineering Science<sub>,</sub> University West<sub>,</sub> SE-46186 Trollhattan<sub>,</sub> Sweden¨ Email address: patrik.lundstrom@hv.se

Department of Mathematics and Natural Sciences<sub>,</sub> Blekinge Institute of Technology<sub>,</sub> SE-37179 Karlskrona<sub>,</sub> Sweden and Department of Engineering<sub>,</sub> University of Skovde<sub>,</sub> SE-54128¨ Skovde<sub>,</sub> Sweden¨

Email address: johan.oinert@bth.se

Departamento de Matematica<sub>,</sub> Universidade Federal de Santa Catarina<sub>,</sub> 88040-970 Florian´ opolis´ SC<sub>,</sub> Brazil

Email address: lanaorga@gmail.com

Escuela de Matematicas<sub>,</sub> Universidad Industrial de Santander<sub>,</sub> Cra. 27 Calle 9 UIS Edificio 45<sub>,</sub> Bucaramanga<sub>,</sub> Colombia

Email address: hpinedot@uis.edu.co
