[[PAGE 1]]
# The Hopf Degree Theorem: Homotopy Groups and Vector Fields

Cameron Krulewski in collaboration with Jenny Walsh

Math 132 Project II submitted May 5, 2017

## 1 Introduction

In algebraic topology, a popular and complicated problem is the calculation of homotopy groups of spheres. These are groups denoted $\pi _ { k } ( S ^ { n } )$ that describe how smooth functions from k spheres to n spheres are related to each other, and while many cases $( k , n )$ have been solved, many yet remain. You may be familiar with the case $k = 1$ , in which the group $\pi _ { 1 } ( S ^ { n } )$ corresponds to the fundamental group of loops in $S ^ { n }$

In this talk, we’ll prove a theorem—the Hopf Degree Theorem—that gives us the homotopy group for all cases of equidimensional spheres. Connecting homotopy to a notion of degree, we will demonstrate that $\pi _ { k } ( S ^ { k } ) \cong \mathbb { Z }$ for all k. In the process, we’ll explore the connections between $\mathbb { R } ^ { k }$ and $S ^ { k }$ ， between degree and winding number and how vector fields curl around a space, and between homotopy and extensions in larger spaces. We will conclude with some applications to vector fields on certain manifolds.

## 2 Background Knowledge and Examples

Before delving into the theorem, we present a few definitions and ideas that we’ll need going forward.

## 2.1 Degree, Intersection Number, and Winding Numbers

Perhaps the most important definition is that of degree, and related to this are the notions of intersection number and winding number.

Formally, the degree of a smooth map $f$ is the intersection number of the map f with some point y in its range. In turn, the oriented intersection number of a map $f : X \to Y$ is defined when $f$ is transversal to a submanifold Z such that Z and X have complementary dimension. The intersection number is the sum of the orientation numbers of the preimages of $Z$ under $f .$ We write deg $f = I ( f , \{ y \} )$ .

Figure 1: Degree 2 Mapping $S ^ { 2 }  S ^ { 2 }$ from Wikipedia


[[PAGE 2]]
Essentially, degree measures how many net times the image of a map f enters and exits the submanifold $Z ,$ or wraps around it— hence it is always an integer. For example, we can imagine a degree two mapping of a 2-sphere to itself as a wrapping of the surface twice around the shape of a sphere, as shown at right. In higher dimensions, it becomes tricky to visualize, but for $S ^ { 1 }$ it is particularly easy. In the diagram below, we present the several smallest degree mappings $S ^ { 1 } \to S ^ { 1 }$ , showing how the image wraps around the circle as well as the “covering space,” which corresponds to properties of the mapping but that we’ll just use as another way to visualize. The degree zero mapping is actually homotopic to a constant map, since we can shrink any portion of the map that doesn’t reach all the way around the circle to a point—remember this, for we’ll elaborate on it in the theorem below. Note that this diagram and argument presents a surjection from the degree map to $\pi _ { k } ( S ^ { k } )$ . With the results of the theorem we’ll conclude injectivity as well.

<!-- image-->

<!-- image-->  
This notion of wrapping around is captured in the definition of winding number, which corresponds to that of degree1 for $S ^ { 1 }$ . In general, however, winding number about a certain point z is defined as the degree of the directional map u : $X  S ^ { 1 }$ such that $\begin{array} { r } { u ( x ) = \frac { f ( x ) - z } { | f ( x ) - z | } } \end{array}$ . We write $W ( f , z ) = \deg ( u )$ Winding numbers are useful because they allow us to examine local behavior of a function, and we will begin the proof by analyzing them.

## 2.2 Isotopy Lemma

Another ingredient we’ll need in the steps ahead is the Isotopy Lemma, which allows us to shift useful points to different locations on the manifold.

Isotopy Lemma and Corollary: Given any two sets of points $\{ x _ { 1 } , . . . , x _ { n } \}$ and $\left\{ y _ { 1 } , . . . , y _ { n } \right\}$ in a connected manifold $Y$ , there exists a diffeomorphism $\phi : Y  Y$ such that $\phi ( x _ { i } ) = y _ { i }$ and $\phi$ is isotopic to the identity.

Note that isotopic means homotopic such that each homotopic map is also a diffeomorphism. We can think of the diffeomorphism $\phi$ as a sort of rotation, or the specification of a direction of flow of the manifold. For example, a map taking the north pole of a sphere to the south pole through a great circle is an isotopy, as is any rotation map on $S ^ { 1 }$

## 2.3 Bump Functions

Since we require a few uses of bump functions, it is appropriate to mention them quickly here. In any dimension, we can find a map $\rho : \mathbb { R } ^ { N } $ R that smoothly transitions from zero to one and back. In

$\mathbb { R } ^ { 1 }$ , an example function is

$$
\rho ( x ) = \left\{ { \begin{array} { l l } { e ^ { - \frac { 1 } { 1 - x ^ { 2 } } } } & { | x | < 1 } \\ { 0 } & { \mathrm { e l s e } } \end{array} } \right. .
$$


[[PAGE 3]]
## 2.4 Euler Characteristic

One more concept we’ll need for an application at the end is that of the Euler characteristic. Strictly speaking, the Euler characteristic $\chi ( X )$ of a space X is defined to be the self-intersection of its diagonal $\Delta = \{ ( x , x ) \mid x \in X \}$ . That is, $\chi ( X ) = I ( \Delta , \Delta )$ . It’s a useful property for classifying manifolds because it is a topological invariant, preserved under diffeomorphism. Calculation of the Euler characteristic can involve triangulations of spaces, but without going into details, we can think of it as a generalization2 of the polyhedral formula $V - E + F = 2$ in R3—polyhedra in less familiar spaces X satisfy $V - E + F =$ $\chi ( X )$ . We’ll return to this concept in the fourth section after proving the Hopf Degree Theorem.

## 3 Proving the Hopf Degree Theorem

We proceed to prove the theorem in nine steps, presenting claims and proofs in each.

## 3.1 Beginning with Winding Numbers

The first step of the theorem is to establish a way to calculate degree, for which we use regular points. Starting from the notion of winding number, we’ll expand this local condition—which allows us to make helpful approximations—across the domain to determine $\deg ( f )$

Claim: Let $f : U \to \mathbb { R } ^ { k }$ be smooth, $U \subset \mathbb { R } ^ { k }$ , and $x \mathrm { ~ a ~ }$ regular point with $f ( x ) = z$ . If B is a sufficiently small closed ball around x, the the boundary map $\partial f : \partial B \to \mathbb { R } ^ { k }$ satisfies

$$
W ( \partial f , z ) = { \left\{ \begin{array} { l l } { + 1 } & { { \mathrm { i f ~ } } f { \mathrm { ~ p r e s e r v e s ~ o r i e n t a t i o n ~ a t ~ } } x } \\ { - 1 } & { { \mathrm { i f ~ } } f { \mathrm { ~ r e v e r s e s ~ o r i e n t a t i o n ~ a t ~ } } x . } \end{array} \right. }
$$

Proof. We start by making some simplifications. First, it suffices to show this part for $x = z = 0$ because we can simply shift our coordinate system to treat the general case. Then, since it’s much easier to deal with linear maps than with general $f ,$ and because we’re concerned with local behavior, we apply Taylor’s Thm. to expand $f$ around 0. If we call the derivative $A = d f _ { 0 }$ , Taylor’s gives

$$
f ( x ) = A x + \varepsilon ( x )
$$

where ${ \frac { | \varepsilon ( x ) | } { | x | } } \to 0 { \mathrm { ~ a s ~ } } x \to 0$ . We can assume B has been chosen small enough so that this holds, including for $\partial f$ around the boundary.

We wish to compute the winding number of $f ,$ which is

$$
\deg ( u ( x ) ) = \deg \left( { \frac { \partial f ( x ) - z } { | \partial f - z | } } \right) = \deg \left( { \frac { \partial f ( x ) } { | \partial f ( x ) | } } \right) = \deg \left( { \frac { A x + \varepsilon ( x ) } { | A x + \varepsilon ( x ) | } } \right) ,
$$

since we set $z = 0$ and used our Taylor expansion. However, we still don’t know how to calculate this. We’d like to reduce just to the linear case and apply the following lemma:


[[PAGE 4]]
Linear Isotopy Lemma: If E is a linear isomorphism of $\mathbb { R } ^ { k }$ that preserves (resp. reverses) orientation, then there exists a homotopy to the identity (resp. a reflection map R through the first coordinate).

This lemma is appealing because we know A is an isomorphism—since 0 is a regular value, A is surjective, and matching dimensions imply bijectivity. We also know that $\deg ( \mathrm { i d } ) = + 1$ , and $\deg ( R ) =$ −1, since each map is bijective and the sign follows from the preimage orientation. So it remains to show that we can reduce our map u to one involving A. However, we know we can do this because we have a homotopy H from $u ( x )$ to $\frac { A x } { | A x | }$ , defined by $\begin{array} { r } { \Breve { H } ( x , t ) = \frac { A x + t \varepsilon ( x ) } { | A x + t \varepsilon ( x ) | } } \end{array}$ | . Since Ax is an isomorphism, the origin is its only zero, and since we’re using it to approximate ∂f away from the origin, we know we won’t be dividing by zero and hence that the definition is valid.

So, we’ve simplified to calculating deg $\left( \frac { A x } { \left| A x \right| } \right)$ , but we may as well take a homotopy from that to Ax itself, by $\textstyle G ( x , t ) = { \frac { A x } { | A x | ^ { 1 - t } } }$ , which satisfies $\begin{array} { r } { g _ { 0 } = \frac { A x } { | A x | } } \end{array}$ and $g _ { 1 } = A x$

We may finally apply the Linear Isotopy Lemma above to conclude that deg $A = \deg f = \pm 1$ depending on whether A (and, correspondingly, f) preserves or reverses orientation.

## 3.2 Connection to Orientation Numbers

That first fact took a few steps, as we first simplified to a linear case and then used a homotopy. But with that solidly proven, we can confidently use it to compute degree.

Claim: Let $f : B \to \mathbb { R } ^ { k }$ be a smooth map defined on a closed ball in $\mathbb { R } ^ { k }$ . If z is a regular value of f that has no preimages on ∂B, then the winding number of $\partial f : \partial B \to \mathbb { R } ^ { k }$ equals the sum of the orientation numbers at each preimage of z.

Proof. To show this, we expand the definition of winding number. We know

$$
\begin{array} { l } { { \displaystyle { W ( \partial f , \{ z \} ) = \deg \left( \frac { \partial f ( x ) - z } { | \partial f ( x ) - z | } \right) } } } \\ { { \displaystyle \qquad = I \left( \frac { \partial f ( x ) - z } { | \partial f ( x ) - z | } , \{ z \} \right) ~ a ~ v a l i d ~ s t e p ~ b e c a u s e ~ z \not \in \mathrm { i m } \partial f } } \\ { { \displaystyle \qquad = \sum _ { y \in f ^ { - 1 } ( z ) } e _ { y } \left( \frac { \partial f ( x ) - z } { | \partial f ( x ) - z | } , \{ z \} \right) } } \end{array}
$$

where $e _ { y }$ denotes the local orientation number of $y .$

Let’s localize these points in $f ^ { - 1 } ( z )$ inside a closed ball B. We can then consider the winding numbers at each of these points by placing each of them within smaller balls $B _ { i }$ . Since each of the points $y _ { i }$ is regular, we have that the derivative at $y _ { i }$ is an isomorphism, and we can apply part 3.1 of the proof to see that each of them has degree ±1.

We’ve shown how the winding number contributes to the degree. But are there other contributions to worry about? Consider the behavior of $f$ outside each of these balls. We know we can extend the direction map $u ( x )$ to all of $B \setminus \bigcup B _ { i }$ because its denominator is nonzero except at the points $y _ { i }$ . And since $u ( x )$ can be extended, we know that $\deg ( u ) = 0$ on this part of the domain.

Hence the winding number of f is the sum of the local orientation numbers of preimages of a regular value z. □


[[PAGE 5]]
## 3.3 Boundary Maps and Extensions

Next we give an extension argument that starts to make the connection between homotopy and degree.

Claim: For a closed ball B and a smooth function $f : \mathbb { R } ^ { k } \setminus \operatorname { I n t } ( B ) \to Y$ , if the restriction $\partial f$ $\partial B \to Y$ is homotopic to a constant map, then $f$ can be extended to all of $\mathbb { R } ^ { k }$

Proof. To extend the map, we use the structure we’ve been given in the statement: the homotopy from $\partial f$ to $c _ { p }$ . Say $G ( x , t )$ is a homotopy such that $g _ { 0 } = c _ { p }$ and $g _ { 1 } = \partial f$ . Then we assume that B is centered at zero, and define the value of f on its interior to be such that $f ( t x ) = g _ { t } ( x )$ . This way, we take the values of $f$ at the boundary of the sphere and pull them in toward the center.

To see that this is well-defined, consider the center of the ball. We might worry that even though G is smooth, the point $f ( 0 ) = g _ { 0 } ( x )$ could take on multiple values dependent on x. However, we chose G precisely so that $g _ { 0 }$ was constant, and so this is not a concern. While smoothness of G guarantees the definition radially, constant behavior near the center guarantees it in the angular direction.

And to make sure that the extension is smooth on the boundary, we may smooth out our homotopy so that it is constant for some period of time near $t = 0$ and for some time near $t = 1$ . We won’t write this out, but claim that it can be done by substituting a bump function for t within the homotopy.

Now turning to maps between spheres, which is at the heart of the problem, we start to set up an induction. We want to show that maps $S ^ { k } \to S ^ { k }$ with degree zero are homotopic to constant maps.

Claim (General): If $f : S ^ { k } \to S ^ { k }$ has degree zero, then $f \sim c _ { p } .$

For our base case, we start at the simplest setup: a map $f : S ^ { 1 } \to S ^ { 1 }$ with $\deg ( f ) = 0$ . We wish to show that this map is homotopic to a constant.

Claim (Base Case): If $f : S ^ { 1 } \to S ^ { 1 }$ has degree zero, then $f \sim c _ { p } .$

We’ve demonstrated this claim in the examples of maps $S ^ { 1 } \to S ^ { 1 }$ above. Any degree zero mapping wraps around the circle zero times—that is, not at all—and thus can be shrunk by a homotopy to a single point. Higher degree maps cannot because they wrap around the non-contractible circle.

This fact can be proven more rigorously by parameterizing the circle, but we rely on an intuitive understanding so that we can focus on the induction. Now, we move toward the general case to establish the theorem for degree zero.

## 3.4 Moving from Spheres to Euclidean Space

We’ll end up frequently using identifications between Euclidean space and spheres in the next few steps, so see the appendix for a summary and some pictorial examples. We use the following fact about maps from $S ^ { k } \operatorname { t o } \mathbb { R } ^ { k + 1 } \setminus \{ 0 \}$ to help build the inductive step.

Claim: If $f : S ^ { k } \to \mathbb { R } ^ { k + 1 } \setminus \{ 0 \}$ has winding number zero with respect to the origin, then $f \sim c _ { p }$

Proof. To go between a sphere $S ^ { k }$ and punctured Euclidean space $\mathbb { R } ^ { k + 1 } \setminus \{ 0 \}$ , we can always use the stereographic projection $\pi _ { s }$ and its inverse. So $\pi _ { s } ^ { - 1 } : \mathbb { R } ^ { k + 1 } \setminus \{ 0 \} \to S ^ { k }$ allows us to find a map $f ^ { \prime } = \pi _ { s } ^ { - 1 } \circ f : S ^ { k } \to S ^ { k }$

Then the winding number of f is the degree of the directional map about zero, or

$$
W ( f ^ { \prime } , \{ 0 \} ) = \deg \left( { \frac { f ( x ) - 0 } { | f ( x ) - 0 | } } \right) = \deg \left( { \frac { f } { | f | } } \right) = \deg ( f ) .
$$

For the last step recall we have a homotopy $\frac { f } { | f | ^ { t } }$ from $f$ to its normalized form.

We now have a map $S ^ { k } \to S ^ { k }$ with degree zero, so we may conclude that it’s homotopic to $c _ { p }$ . Since homotopy is transitive, we can apply the previous part to see that $f \sim c _ { p }$ , as desired. □


[[PAGE 6]]
## 3.5 Adjusting the Range

Next, we want to show that if we have maps $\mathbb { R } ^ { k } \to \mathbb { R } ^ { k }$ that we can treat the range as a sphere. That is, we can punch out the origin from the range given certain conditions on $f .$

Claim: Let $f : \mathbb { R } ^ { k }  \mathbb { R } ^ { k }$ be smooth, with 0 a regular value. If $f ^ { - 1 } ( 0 )$ is finite and the orientations of the preimage points adds to zero, then—assuming the statement above—there exists a map $g : \mathbb { R } ^ { k } $ $\mathbb { R } ^ { k } \setminus \{ 0 \}$ such that $f = g$ outside a compact set.

Proof. Since the orientations of the preimage points add to zero, we know by step 3.2 that f has winding number zero about the origin. Then place an open ball B around the origin such that $f ^ { - 1 } ( 0 ) \subset B$ and consider the restricted map $\partial f : \partial B \to \mathbb { R } ^ { k } \setminus \{ 0 \}$

As the boundary of a ball, $\partial B \simeq S ^ { k - 1 }$ , so if we define $\partial f ^ { \prime } : S ^ { k - 1 } \to \mathbb { R } ^ { k } \setminus \{ 0 \}$ we can apply step 3.4 and the inductive hypothesis to see that $\partial f ^ { \prime }$ : is homotopic to a constant map. Then, we can apply 3.3 to extend $f$ to a smooth map g on all of $\mathbb { R } ^ { k }$

Note that g is nonzero within B because it is defined away from any of the preimages of zero, so $f$ and g don’t agree on B¯. But this gets us precisely what we want for the next part, since g maps to $\mathbb { R } ^ { k } \setminus \{ 0 \} \simeq S ^ { k }$ □

## 3.6 The Inductive Step

Now it’s time to complete the induction, and prove the claim in general. Recall the statement:

Claim: If $f : S ^ { k } \to S ^ { k }$ has degree zero, then $f \sim c _ { p }$

Proof. Let $f : S ^ { k } \to S ^ { k }$ have degree zero. We want to pick a few points for the purposes of eventually reducing $S ^ { k }$ to $\mathbb { R } ^ { k }$ , so we use Sard’s Thm. to pick two regular values a and b. By well-definedness of $f ,$ we know $f ^ { - 1 } ( a ) \cap f ^ { - 1 } ( b ) = \emptyset$

We want to take a subset U of $S ^ { k }$ such that $f ^ { - 1 } ( a ) \subset U \subset S ^ { k } \setminus \{ f ^ { - 1 } ( b ) \}$ , and to do this, we may take U such that $f ^ { - 1 } ( a ) \subset U$ and apply the Isotopy Lemma to find a diffeomorphism $\phi$ that maps any points in $f ^ { - 1 } ( b )$ that lie inside U to somewhere outside of U. Then we can compose $\phi ^ { - 1 } \circ f$ to ensure that we have U as desired. For the purposes of this proof we’ll assume that $U$ has been constructed properly, and we’ll just write f for the function.

Now, we want to use our statements about maps in $\mathbb { R } ^ { k }$ , so we compose on either side of f to arrange this. We take $\alpha : \mathbb { R } ^ { k }  U \subset S ^ { k }$ to be just a local parameterization of $U .$ , and $\beta : S ^ { k } \setminus \{ b \}  \mathbb { R } ^ { k }$ the stereographic projection, which we may pick such that $\beta ( a ) = 0$ . Then our map looks like this:

$$
\mathbb { R } ^ { k } \xrightarrow { \alpha } U \xrightarrow { f | _ { U } } S ^ { k } \backslash \{ b \} \xrightarrow { \beta } \mathbb { R } ^ { k } \ ,
$$

and we call the composition map $\tilde { f } : = \beta \circ f \circ \alpha$ . Since we chose $\beta ( a ) = 0$ , we know that 0 is a regular value of $\tilde { f }$ because a is a regular value of $f .$

<!-- image-->


[[PAGE 7]]
So we have constructed a map $\mathbb { R } ^ { k } \to \mathbb { R } ^ { k }$ with 0 as a regular value. Furthermore, $\tilde { f } ^ { - 1 } ( 0 )$ has the same properties as $f ^ { - 1 } ( a )$ (if we require our maps to be orientation-preserving) in the sense that the orientation numbers of the preimages $\tilde { f } ^ { - 1 } ( 0 )$ add to zero. This is exactly what we need to apply step 3.5 and extend the map. Doing so, we get a map $\tilde { g } : \mathbb { R } ^ { k }  \mathbb { R } ^ { k } \backslash$ {0} that agrees with $\tilde { f }$ except on some compact set $K$

We’ve used step 3.5 to remove a point in our range, but now we want to return to the spheres to complete the induction. We can compose $\tilde { g }$ with the inverses of our earlier maps to force it to map between the spheres—set $g : = \beta ^ { - 1 } \circ \tilde { g } \circ \alpha ^ { - 1 }$ . Now, originally $\tilde { g }$ failed to hit b by construction, but that may no longer be the case when we extend it from $U$ to all of $S ^ { k }$ . However, we do know that $g$ fails to hit a—since $\tilde { g }$ does not hit zero, the image of a, we know that $g$ cannot possible hit a. We can write $g : S ^ { k }  S ^ { k } \setminus \{ a \}$

All of our work was for that point removal, because now we can stereographically project $S ^ { k } \backslash$ $\{ a \} \to \mathbb { R } ^ { k }$ Since Euclidean space is contractible, we know that $\tilde { g }$ is homotopic to a constant $c _ { p } .$ . It remains to show that $f$ itself is homotopic to $\tilde { g }$ and thus to $c _ { p } .$ , but this follows from the construction $H ( x , t ) = ( 1 - t ) ( \beta \circ f ) ( x ) + t ( \beta \circ g ) ( x )$ , which basically shifts $f$ to $g$ by scaling, then maps it back to the sphere by $\beta .$

Hence we have shown that $f \sim c _ { p }$ , using step 3.5 to complete the induction.

## 3.7 Extending into Euclidean Space

Now that we have the desired statement about maps between spheres, we want to take the next step toward generalizing the domain. To that end, we turn to something called the Extension Theorem.

Extension Theorem: Let W be a compact, connected, oriented k + 1-dimensional manifold with boundary, and $f : \partial W \to S ^ { k }$ a smooth map. Then $f$ extends smoothly to a map ${ \bar { f } } : W \to S ^ { k }$ such that $\partial \bar { f } = f$ , if and only if $\deg ( f ) = 0$

To get to this theorem, we need a few other results first. We next prove the following claim.

Claim: If W is a compact manifold with boundary and $f : \partial W \to \mathbb { R } ^ { k + 1 }$ is smooth, then $f$ may be extended to all of $W$ .

Proof. To prove this we want to invoke the Epsilon Neighborhood Theorem, which allows us to thicken our manifold boundary into something useful.

Epsilon Neighborhood Theorem: For a compact boundaryless manifold Y and $\varepsilon > 0$ , if $Y ^ { \varepsilon }$ is the set of points in $\mathbb { R } ^ { N }$ within ε of $Y .$ , then $Y ^ { \varepsilon }$ is a manifold. Furthermore, if π takes points in $Y ^ { \varepsilon }$ to the closest point to them in $Y .$ , then $\pi : Y ^ { \varepsilon } \to Y$ is a submersion and $\pi | _ { Y } = i d _ { Y }$

Since W is compact, so is its boundary. And ∂W is oriented with the boundary orientation, so we can indeed apply the Epsilon Neighborhood Theorem to thicken $\partial W$ to $U$ . Then we define $F = f \circ \pi : U \to \mathbb { R } ^ { k + 1 }$

To make this definition smooth, we need to scale F appropriately. We can use a bump function $\rho : \mathbb { R } ^ { N }  \mathbb { R }$ such that $\rho | _ { \partial W } = 1$ and $\rho | _ { \mathbb { R } ^ { n + 1 } \backslash K } = 0$ for some $K \subset U$ . Then, we define $\bar { F }$ as follows:

$$
\bar { F } ( x ) = \left\{ \begin{array} { l l } { \rho F ( x ) } & { x \in U } \\ { 0 } & { \mathrm { e l s e } } \end{array} \right. .
$$

This way, $\bar { F }$ extends to all of $\mathbb { R } ^ { N }$ . Since we really only wanted to define the map on $W$ , we can restrict $\bar { f } = \bar { F } | _ { W }$ to get the desired ${ \bar { f } } .$ . □


[[PAGE 8]]
## 3.8 The Extension Theorem

With that done, we prove the Extension Theorem in full by shifting from $\mathbb { R } ^ { k + 1 }$ to $S ^ { k }$ . Starting from a map $f : \partial W \to S ^ { k }$ , we can apply step 3.7—if and only if $\deg ( f ) = 0 \ z \mathrm { - } \mathrm { t o }$ extend $f$ to $\bar { f } : W \to \mathbb { R } ^ { k + 1 }$ ， where $\mathbb { R } ^ { k + 1 }$ is the ambient space containing $S ^ { k }$ . By Sard’s Thm., this map has regular values. Say that zero is a regular value of $\bar { f }$ (and if it isn’t, use the Transversality Extension Theorem to find a homotopic map that does have zero as a regular value). Consider the preimages of zero; we can require ${ \bar { f } } ^ { - 1 } ( 0 ) \subset U$ for some open subset $U .$ We can also require, by the Isotopy Lemma, $U \subset$ Int $W$ , by modifying $\bar { f }$ to some homotopic map $\tilde { f }$ if necessary.

Then as an open subset, $U \simeq \mathbb { R } ^ { k + 1 }$ . If we take a ball B such that $\tilde { f } ^ { - 1 } ( 0 ) \subset B \subset U$ , then we can define a function $\partial \tilde { f } : \partial B \to \mathbb { R } ^ { k + 1 } \setminus \{ 0 \}$ . We know that this map has winding number zero by assumption that it has degree zero, so we know by step 3.4—the corollary—that $\tilde { f }$ is homotopic to a constant. From there, we know by step 3.3 that $f$ may be extended to the inside of the ball such that the range is unchanged. Call this extension ${ \tilde { F } } ,$ , and note that it runs $W \to \mathbb { R } ^ { k + 1 } \setminus \{ 0 \}$ . By composing with the reverse of the stereographic projection, we finally arrive at a map $F : W \to S ^ { k }$ that extends $f .$

## 3.9 At Last, the Hopf Degree Theorem

We finally have all of the ingredients we need to claim the Hopf Degree Theorem. Recall the statement: Hopf Degree Theorem: Let X be a compact, connected, oriented k-manifold. Two maps from X to $S ^ { k }$ are homotopic if and only if they have the same degree.

Proof. The exciting, critical step in the proof is constructing a larger manifold that allows us to connect what we’ve proven about extensions with the notion of homotopy.

Let $f , g : X \to S ^ { k }$ be the two maps we’re considering. Define the product manifold $W = X \times I$ where I is the unit interval. If we had a homotopy between $f$ and $g ,$ , this would be our domain. Correspondingly, $\partial W = X \times \{ 0 , 1 \}$ . Define a map $F : \partial W \to S ^ { k }$ such that $F | _ { X \times \{ 0 \} } = f$ and $F | _ { X \times \{ 1 \} } = g$

<!-- image-->

and if we flattened them out:

<!-- image-->


[[PAGE 9]]
Now, if F can extend to all of W smoothly, we’ve found a homotopy between f and g. And this is precisely what occurs if $\deg ( F ) = 0$ , invoking the Extension Theorem of step 3.8. The diagram above shows that we can think of the image of W as a sort of stack of the images of each homotopic map $f _ { t }$ In two dimensions, they combine to form a smooth 3-dimensional shape. We’re arguing that if maps on either end of that 3-d shape extend to maps to $S ^ { 2 }$ , then if we consider the boundary maps separately, the volume in between smoothly connects them via homotopies.

The only thing that remains is to connect the degree of F with the degrees of $f$ and $g .$ . To do this, we appeal to the definition of degree in terms of intersection number. Essentially, we focus on the boundary for the calculation, and recall that the orientation numbers at either end of an interval must be opposite. Written out, we have

$$
\begin{array} { r l } & { \deg F = 0 \iff I ( F , \{ p \} ) = 0 } \\ & { \iff I ( \partial F , \{ p \} ) \mathrm { ~ s i n c e ~ w e ~ m a y ~ c o n s i d e r ~ i n t e r s e c t i o n s ~ a t ~ t h e ~ b o u n d a r y } } \\ & { \iff I ( \partial F | _ { X \times \{ 0 \} } ) - I ( \partial F | _ { X \times \{ 1 \} } ) \mathrm { ~ s i n c e ~ t h e ~ e n d s ~ o f ~ } I \mathrm { ~ a r e ~ o p p o s i t e l y ~ o r i e n t e d } } \\ & { \iff I ( f , \{ p \} ) - I ( g , \{ p \} ) = 0 } \\ & { \iff I ( f , \{ p \} ) = I ( g , \{ p \} ) } \\ & { \iff \deg f = \deg g . } \end{array}
$$

Hence F can be extended, and thus $f \sim g ,$ , precisely when the degrees of $f$ and g match.

## 4 Results and Applications of the Theorem

## 4.1 Shifting to Vector Fields

Now that we’ve finally proven the theorem, after all that buildup with extensions, we can actually use it to examine properties of vector fields on different types of spaces. We’ll work toward another theorem that states the following:

Theorem: Let X be a compact, connected, oriented manifold. Then X possesses a nonvanishing vector field if and only if its Euler characteristic is zero.

To get there, let’s start with a fact that follows closely from our previous work.

Claim: If \~v is a vector field on $\mathbb { R } ^ { k }$ with finitely many zeros, such that the sum of indices of its zeros is also zero, then there exists some vector field \~w that has no zeros but equals \~v outside of a compact set.

Proof. This follows just from expanding definitions. We can write the vector field as $\vec { v } ( x ) = ( x , v ( x ) )$ for a smooth map $v : \mathbb { R } ^ { k }  T ( \mathbb { R } ^ { k } ) = \mathbb { R } ^ { k }$ . Index at a particular point, written $\operatorname { i n d } _ { 0 } ( x )$ , corresponds exactly to the degree of the directional map $\frac { \vec { v } } { | \vec { v } | }$ , or equivalently, $\frac { v } { | v | }$ at that point. So we can equate this with the winding number of v around zero, and use the hypothesis that $W ( v , \{ 0 \} ) = 0$ . From there, we may apply step 3.5 to find a function $w : \mathbb { R } ^ { k }  \mathbb { R } ^ { k } \backslash \{ 0 \}$ that agrees with v except on a compact set. Form the vector field \~w as $\vec { w } ( x ) = ( x , w ( x ) )$ to conclude the claim. □

## 4.2 From $\mathbb { R } ^ { k }$ to X

To make this a bit more general, consider a compact manifold X.

Claim: On any compact manifold X, there exists a vector field with finitely many zeros.


[[PAGE 10]]
Proof. For this proof, as in 3.9, we use the trick of taking a convenient larger manifold, in this case T X, the tangent bundle. Recall that $T X = \{ ( x , v ) \mid x \in X$ and $v \in T _ { x } { ( X ) } \}$ , and that if dim $X = k ,$ then dim $T X = 2 k$ We’re going to pick two transverse submanifolds of complementary dimension, then apply the codimension equation,

$$
\operatorname { c o d i m } \left( X \cap Z \right) = \operatorname { c o d i m } X + \operatorname { c o d i m } Z ,
$$

and compactness to show finite intersection. We pick our manifolds carefully so that their intersection corresponds exactly to the zeros of v.

Let $W = W \times \{ \vec { 0 } \} \subset T X$ be one of our manifolds, and im (\~v) be the other. Note that im $( \vec { v } ) =$ $\{ ( x , v ( x ) ) \mid x \in X \} = \mathrm { g r a p h } ( v )$ , and the graph of v is also a subset of T X with dimension k. And by the Transversality Homotopy Theorem graph(v) can be shifted if necessary, by applying a homotopy taking v to $v ^ { \prime }$ , to a manifold transversal to W . Then, since W t graph(v’) and the manifolds have complementary dimension, we know their intersection $W \cap \mathrm { g r a p h } ( v ^ { \prime } )$ has dimension $2 k - k - k = 0$ and is hence discrete. By compactness, we conclude that the intersection is finite.

Now, the intersection essentially tests whether $v ^ { \prime } ( x ) = 0$ in the second coordinate of each point, so it collects all of the zeros of the vector field. Hence we have shown that ${ \vec { v } } ^ { \prime }$ is a vector field on X with finitely many zeros. □

## 4.3 Localizing

Next, we’d like to localize the zeros of the manifold, which we can do with the help of the Isotopy Lemma.

Claim: If U is any open set on a compact, connected manifold X, there exists a vector field with finitely many zeros, all of which are inside U .

Proof. Let v be some vector field with finitely many zeros, which we know to exist by step 3.3. We can again apply the Isotopy Lemma to find a diffeomorphism φ that takes any $x \notin U$ such that $v ( x ) = 0$ to a point $\phi ( x ) \in U$ , moving any zeros outside of U to inside. Then we can define a new vector field ${ \vec { v } } ^ { \prime }$ such that $\vec { v } ^ { \prime } ( x ) = ( x , \phi ^ { - 1 } \circ v ( x ) )$ . Then any zeros of the vector field are necessarily inside U. □

## 4.4 Theorem and Results

Finally, we prove the theorem, which leads to some fun results.

Theorem: Let X be a compact, connected, oriented manifold. Then X possesses a nonvanishing vector field if and only if its Euler characteristic is zero.

Proof. To complete the proof, we need to invoke another powerful result involving Hopf, the Poincar´e-Hopf Index Theorem. It states the following:


[[PAGE 11]]
Poincar´e-Hopf Index Theorem: If \~v is a smooth vector field on a compact, oriented manifold X, then the sum of the indices of \~v equals the Euler characteristic of X.

We will take this theorem as given, but offer the intuition that the vector field prescribes a flow of the points in X, and where the zeros of \~v are fixed under an infinitesimal transformation of X along its vector field. If the manifold didn’t move at all, we’d be completing the identity transformation, which is where you should see the connection to the diagonal in the Euler characteristic definition. How the vector field flows thus forms another way to distinguish manifolds.

Back to the proof of this theorem. First, we use steps 4.2 and 4.3 to find a vector field on X with finitely many zeros, all localized to a subset $U \subset X$ . If and only if X has a nonvanishing vector field, the sum of the indices of the zeros is zero, by step 4.1. Note that since Poincar´e-Hopf relies on indices calculated after we pull back to parameterisations in $\mathbb { R } ^ { k }$ , we can assume that our indices all refer to the zeros of v. Then applying Poincar´e-Hopf, we get that the indices summing to zero holds if and only if the Euler characteristic is zero, and the theorem is shown. □

In summary, we just showed

$$
( X { \mathrm { ~ h a s ~ a ~ n o n v a n i s h i n g ~ v e c t o r ~ f i e l d } } ) \longleftrightarrow \sum { \mathrm { i n d i c e s } } = 0 \longleftrightarrow \overbrace { \sum { \mathrm {  ~ \Omega ~ } } } ^ { \mathrm { P - H } } \chi ( X ) = 0 .
$$

What can we say about some of our familiar manifolds? Given the Euler characteristics, we can say whether or not they have nonvanishing vector fields. For spheres and tori, we have

$$
\chi ( S ^ { k } ) = \left\{ \begin{array} { c c } { { 0 } } & { { k \mathrm { ~ o d d } } } \\ { { 2 } } & { { k \mathrm { ~ e v e n } } } \end{array} \right. \quad \quad \mathrm { a n d } \quad \quad \chi ( T ^ { k } ) = - 2 ( k - 2 )
$$

In the case of spheres, we see that only odd-dimensional spheres have smooth nonvanishing vector fields. This proves in particular the Hairy Ball Theorem, a popular result.

Hairy Ball Theorem: There is no nonvanishing smooth vector field on a 2-sphere. That is, you can’t comb the hair on a coconut.

Interestingly, two more manifolds with characteristic $\mathrm { z e r o ^ { 3 } }$ are the M¨obius strip and the Klein bottle. It’s surprising that these paradoxical shapes that defy obvious embeddings could have smooth nonvanishing vector fields defined on them! In fact, the M¨obius strip has no nonvanishing smooth normal vector field, even though it has a nonvanishing tangent vector field. A popular example is that of an ant walking continuously along the side of the strip, which inspired M.C. Escher.

Figure 2: Mobius Strip II by Escher

<!-- image-->

These results also have ramifications for vector fields on the earth, such as wind and water currents, and, for example, for virtual reality video, in which smooth vector fields avoid problems of stretched pixels and stereo4. And just to demonstrate a couple smooth vector fields on the 2-torus and the Klein bottle, we present the following drawings5.

<!-- image-->  
2-torus

<!-- image-->  
Klein bottle

## 5 Conclusion


[[PAGE 12]]
In this talk, we’ve demonstrated used the concepts of homotopy, degree, and winding number to achieve notable results about homotopy groups and vector fields. By demonstrating that elements of $\pi _ { k } ( S ^ { k } )$ are determined precisely by their (integral) degree, we’ve shown the isomorphism $\pi _ { k } ( S ^ { k } ) \cong \mathbb { Z }$ Combine that with the fact that lower dimensional spheres can only map trivially into lower ones—that is, $\pi _ { k } ( S ^ { n } ) = 0$ higher $n < k { \mathrm { - w e } } ^ { 3 } \mathrm { v } \epsilon$ solved more than half of the problems of calculating homotopy groups.

Now, this sounds fairly impressive until one considers that homotopy groups $\pi _ { k } ( S ^ { n } )$ with $k \ < \ n$ do not follow such a regular pattern. Why we have $\pi _ { 1 1 } ( S ^ { 5 } ) \cong \mathbb { Z } _ { 2 }$ but $\pi _ { 1 4 } ( S ^ { 4 } ) \cong \mathbb { Z } _ { 1 2 0 } \times \mathbb { Z } _ { 1 2 } \times \mathbb { Z } _ { 2 }$ is not immediately apparent6. But if it were, then homotopy groups would not be such an interesting problem!

Figure 3: Hopf Fibration from Wikipedia

To end with a less mysterious example, we can invoke Hopf once more to offer a visualizable element in a set $\pi _ { k } ( S ^ { n } )$ with $k < n$ Namely, there is a nontrivial element in $\pi _ { 3 } ( S ^ { 2 } )$ known as the Hopf fibration or Hopf bundle. Shown at right, it maps the 3-sphere into the 2-sphere nontrivially.

## 6 Works Cited

<!-- image-->

1. “Degree of a Continuous Mapping.” Wikipedia. Wikimedia Foundation, 12 Apr. 2017. Web. 01 May 2017.

2. Escher, M. C. M¨obius Strip II. Digital image. M.C. Escher. The M.C. Escher Company B.V., n.d. Web. 05 May 2017.

3. “Euler Characteristic.” Wikipedia. Wikimedia Foundation, 26 Mar. 2017. Web. 05 May 2017.

4. Guillemin, Victor, and Alan Pollack. Differential Topology. Providence, RI: AMS Chelsea Pub., 2014. Print.

5. Hart, Vi. “EleVRant: The Hairy Ball Theorem in VR Video.” EleVR. Human Advancement Research Community, 13 June 2014. Web. 05 May 2017.

6. “Homotopy Groups of Spheres.” Wikipedia. Wikimedia Foundation, 10 Apr. 2017. Web. 04 May 2017.

7. “Hopf Fibration.” Wikipedia. Wikimedia Foundation, 25 Mar. 2017. Web. 05 May 2017.

8. Weisstein, Eric W. “Euler Characteristic.” Wolfram Math-World. Wolfram Research, Inc., n.d. Web. 05 May 2017.

## 7 Appendix


[[PAGE 13]]
In step 3.4 and onward, we used identifications between punctured spheres and Euclidean space and vice versa. Summarized, they are as follows.

• Locally, subsets of $\mathbb { R } ^ { k }$ and $S ^ { k }$ are homeomorphic, by the manifold structure of the k-sphere.

• Euclidean space minus a point is homeomorphic to a sphere, so $\mathbb { R } ^ { k + 1 } \setminus \{ p \} \simeq S ^ { k }$

• Conversely, one could also view the sphere as the one-point compactification of Euclidean space. The sphere minus a point reduces to Euclidean space, so $S ^ { k } \setminus \{ p \} \simeq \mathbb { R } ^ { k }$

It’s important to believe that these identifications work, so consider the following process. Start from the sphere. Remove one point to arrive at a space homeomorphic to the plane. Then remove another—we get the circle. If we remove a third point, we break connectivity and are left with the real line. That is, $S ^ { 2 } \setminus \left\{ p _ { 1 } \right\} \simeq \mathbb { R } ^ { 2 } , \mathbb { R } ^ { 2 } \setminus \left\{ p _ { 2 } \right\} \simeq S ^ { 1 }$ , and $S ^ { 1 } \backslash \{ p _ { 3 } \} \simeq \mathbb { R }$ . A diagram for the process is included below.

<!-- image-->

## 8 Acknowledgements

Professor George Melvin was instrumental in helping me and Jenny figure out the parts of this proof, and gave excellent advice on how to present the material.