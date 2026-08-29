[[PAGE 1]]
# Closing the gap and settling the problem of queens on an $n \times n$ board, each attacking at most one other

Kristina Ago<sup>1</sup>, Bojan Baˇsi´c<sup>1,∗</sup>, Radojka Ciganovi´c<sup>2</sup>

<sup>1</sup>Department of Mathematics and Informatics, University of Novi Sad,

Trg Dositeja Obradovi´ca 4, 21000 Novi Sad, Serbia

kristina.ago@dmi.uns.ac.rs, bojan.basic@dmi.uns.ac.rs

<sup>2</sup>Faculty of Technical Sciences, University of Novi Sad, Trg Dositeja Obradovi´ca 6, 21000 Novi Sad, Serbia ciganovic.radojka@uns.ac.rs

## Abstract

Let q(n) denote the largest number of queens that can be placed on an n × n chessboard so that no queen attacks more than one other queen. We prove that $q ( n ) = \lfloor 4 n / 3 \rfloor$ for every $n \geqslant 6 .$ , and that $q ( n ) = n$ for $n \leqslant 5 ,$ which settles a previously conjectural value. As a corollary, we also settle that, in the version of the problem where each queen attacks exactly one othe queen, the answer is $2 \lfloor 2 n / 3 \rfloor$ , again as previously conjectured.

Mathematics Subject Classification (2020): 05B40, 05B30, 05C69, 00A08

Keywords: queens problem, chessboard, independence, toroidal queens

## 1 Introduction

Few recreational problems have proved as durable as that of placing eight queens on a chessboard so that no two of them attack each other. It was posed in 1848 by the chess composer Max Bezzel [3] (writing under the pseudonym Schachfreund) in the Berliner Schachzeitung, and restated two years later by Nauck [19] in the Illustrirte Zeitung; it was Nauck’s note that caught the eye of Gauss, who worked on the problem in his correspondence with Schumacher and at first found only 72 of the 92 solutions. The frequently repeated claim that Gauss posed the problem, or that he solved it completely, is a textbook illustration of how a historical error propagates; the matter was disentangled by Campbell [5]. The general problem on an $n \times n$ board was posed by Lionnet [14] in 1869, and the first proof that n nonattacking queens can be placed whenever n ⩾ 4 is due to Pauls [22] (and not, as is often written, to Ahrens, though his book [1] may have contributed significantly to popularizing the subject).

What has kept the problem alive is that nearly every question about it other than the existence question turns out to be hard. As an example, we mention counting; it took more than twenty years to settle the problem, which happened only quite recently. Let $Q ( n )$ denote the number of ways of placing n nonattacking queens on an $n \times n$ board. Rivin, Vardi, and Zimmermann [25] conjectured that log Q(n) grows like n log n. Luria [15] proved an upper bound of the expected shape; matching lower bounds were obtained by Bowtell and Keevash [4] and, independently, by Luria and Simkin [16]; and finally Simkin [26] showed that $Q ( n ) = ( ( 1 \pm o ( 1 ) ) n e ^ { - \alpha } ) ^ { n }$ for a constant α, which he located to within $3 { \cdot } 1 0 ^ { - 3 }$ and which Nobel, Agrawal, and Boyd [20] have since computed to nine decimal places.

For various variations of this setting, the reader may check some of the surveys [27, 2, 11]. One more result that we want to point out in particular is a classical result of P´olya [23] (published in an appendix to the second volume of the already mentioned Ahrens’s book), which states that n non-attacking queens can be placed on a toroidal $n \times n$ board if and only if $\operatorname* { g c d } ( n , 6 ) = 1$ . Although toroidal boards could seem like quite an abstract notion, not really occurring in everyday life, it turns out (surprisingly?) that they have a significant role in many other more natural-looking problems, and in particular, they are in the center of the present article.

[[PAGE 2]]
The problem we are focusing on in the present article is the following one. What is the maximal number of queens that can be placed on an $n \times n$ board, in such a way that each of them attacks at most one other queen? The problem probably appeared in print for the first time in the book of Gik [7]. He proved the upper bound of $\textstyle \left\lfloor { \frac { 4 n } { 3 } } \right\rfloor$ and showed that 10 queens can be achieved on an $8 \times 8$ board. The problem was brought up again by Kim [13], and this reference was then popularized by Gardner [6], which is probably why the problem is often attributed to Kim (and another reason could be that, as Gardner states in his article, Kim thought of the problem already while in high school, in 1975, which is one year before Gik’s book). There we can see that other variants of the problem can also be considered, namely, when $^ { 6 6 } \mathrm { a t }$ most one” is replaced by $^ { 6 6 } \mathrm { a t }$ most $k ^ { \dprime }$ , or when exactly k attacks are prescribed instead of at most k. Hayes [8] settled some of the cases in 1992, and presented the best at-the-time upper bound on other cases.

Therefore, here we focus on the $k = 1$ case, at most one attack per queen. However, it turns out that “at most one” and “exactly $\mathrm { o n e } ^ { \mathfrak { N } }$ versions are tightly connected, and once we settle the first one, the second one also follows quite cheaply (see Corollary 2.3). We first present some further historical checkpoints. In August 2008, the IBM Corporation posed the problem on its website as a challenge: in particular, it was required to find the best possible arrangement on a $3 0 \times 3 0$ board (and also an $8 \times 8$ board, which is less relevant). The intended solution was to settle the challenge by some eficient computer-based techniques, in particular, by solving it as a Constraint Satisfaction Problem. The sequence of proved optimal values appeared in the OEIS in 2015 [21]; that year, Resta [24] managed to produce optimal solutions for all $n \times n$ boards up to $n = 3 0$ , and based on that, he conjectured that the correct value is $\left\lfloor { \frac { 4 n } { 3 } } \right\rfloor$ for every n greater than 5. The case $n = 2 0 1 7$ was posed by the second-named author of the present article, in collaboration with other members of the problem selection committee, at the Serbian Mathematical Olympiad 2017 [18]. In this case, the answer again turned out to be $\textstyle \lfloor { \frac { 4 n } { 3 } } \rfloor$ , but what should also be mentioned here is that this marked possibly the first time when the idea of generating larger boards by embedding toroidal boards into smaller $\mathrm { \Delta ^ { 6 } h o s t ^ { 7 } }$ boards was applied to this particular problem. The idea itself was certainly not new, as it can be traced all the way back to P´olya, who used that approach in his already mentioned article, but for the original, non-attacking queens problem, not for a limited number of attacks. Also, the solution page of the mentioned IBM challenge gives a construction for $n = 3 0$ sent by one of the solvers, which is exactly the one that can be obtained by these toroida embeddings; however, the necessity of considering tori was never understood on that page, and in fact, the claim there that this pattern can be generalized to any board whose side length is divisible by 6 is actually erroneous.

A real milestone was reached by Makay [17], who managed to unleash the full power of the In particular, his construction works for all numbers from 354 onward, as well as for many values below this cutof, but significantly many “holes” remain. The purpose of this article is to develop a few tricks that are, taken together, strong enough to cover all the remaining cases and settle the problem in full.

The initial plan was to use Resta’s list [24] up to $n = 3 0$ as known, and to make the article self-contained for all the other values. However, while we were in the finishing stage of preparation of the article, an extended list by Healy [9] appeared, covering all the cases up to $n = 7 2$ . While the cases between $n = 3 1$ and $n = 7 2$ could in principle be handled by our techniques (or some sligh modifications that are not in this final version of the article), a few exceptional cases would remain and they would need to be taken care of individually. For that reason, we decided to use Healy’s table for n up to 72 and to cover only the rest, which spared us and the reader such inconveniences, and additionally, enabled us to make some parts simpler.

Note added after completion of the manuscript. As fate would have it, after this manuscript was finished and when the authors were ready to submit it for publication, an independent manuscript by Healy [10] appeared (four days before the submission date of the present manuscript), solving the same problem. What we can say about the comparison between his manuscript and ours is that (of course) the essence of both is again toroidal embedding. What he uses in addition is polishing the idea of adding a new board at the bottom right as much as possible; he generated such boards (with some special properties) up to size 29, and by combining them, he can solve the problem on all the boards from $n = 2 1 6$ onward; the same argument also covers a selection of numbers below 216, while for other ones he relies on some exceptional constructions. An attractive feature of his approach is therefore that its uniform large-order part is built around essentially one additional mechanism beyond the toroidal construction. Our proof uses several diferent extension mechanisms instead. On the other hand, it is substantially less dependent on a catalogue of computer-generated auxiliary boards: most of our auxiliary boards have a simple visible structure, and furthermore, at least for some value of n onward (after the need for some “more exotic” patches stops), the construction becomes recursive and requires no further search or stored configurations, and probably can be easily reconstructed by a human.

[[PAGE 3]]
## 2 Preliminaries and the upper bound

We work on the $n \times n$ board, whose rows and columns are numbered $1 , 2 , \ldots , n ;$ a cell is written as a pair $( r , c )$ , its row first. In our figures, rows are enumerated from top to bottom, and columns from left to right. Although this is diferent from the usual chess convention (where rows are enumerated from bottom to top), we feel that the chess analogy becomes quite muddled once we reach boards of much larger size than $8 \times 8 .$ , and thus opting for usual convention for matrices instead of chess seemed to us like a more natural choice. With every cell we associate four numbers: its row $r ,$ its column $c ,$ its diference $r \mathrm { ~ - ~ } c ,$ and its sum $r + c .$ . Two cells lie on a common line of the board (on a row, a column, a diagonal, or an antidiagonal) precisely when they agree in one of these four numbers, and two diferent cells can agree in at most one of them. (Note: here, by antidiagonal, we mean the set of cells with a fixed sum. This usage will be kept in the article when we find necessary to make a distinction between the fixed diference and the fixed sum, but in some other places, when the context is clear, both those kinds of lines will be simply referred to as diagonals. We believe that this will not cause any confusion.)

A configuration is a set of cells, thought of as the cells occupied by queens. The queens are ordinary chess queens, so two of them attack each other if they lie on a common line and no queen stands between them. We call a configuration admissible if no queen attacks more than one other queen, we let $q ( n )$ be the largest number of queens in an admissible configuration on the $n \times n$ board, and we call an admissible configuration with $q ( n )$ queens optimal.

Theorem 2.1. For every positive integer n we have

$$
q (n) \leqslant \left\lfloor \frac {4 n}{3} \right\rfloor .
$$

Proof. Let m queens be placed on an n×n board for some m, and suppose m $> n .$ . No row contains more than two queens, so there are at least $m - n$ rows with two queens, and hence there are at most $m - 2 ( m - n )$ , which is $2 n - m$ queens that are alone in their rows. Similarly, at most $2 n - m$ queens are alone in their columns. On the other hand, every queen is alone in its row or column, which means that every queen is accounted for in the previous count, that is, $2 ( 2 n - m ) \geqslant m$ . Thus m $\leqslant \frac { 4 n } { 3 }$ . As m is an integer, the conclusion follows. ■

For $n \leqslant 5$ the bound of Theorem 2.1 is not attained: an inspection of the finitely many configurations gives $q ( n ) = n$ for $1 \leqslant n \leqslant 5$ , whereas $\lfloor 4 n / 3 \rfloor$ equals 4, $5 ,$ and 6 for $n = 3 , 4 , 5$

From $n = 6$ on the bound is attained, and for small boards this is known explicitly. Healy [9] lists an optimal configuration for every n up to 72, and an earlier list of Resta [24] does the same for $6 \leqslant n \leqslant 3 0 ;$ ; in particular $q ( n ) = \lfloor 4 n / 3 \rfloor$ for $6 \leqslant n \leqslant 7 2$ . These two lists are the only external input of this article (and, actually, only some smaller parts of them are really needed, but we decided that it is cleaner to reference them instead of presenting separate constructions for the exceptional values we need). The result is the following.

Theorem 2.2. For every positive integer n we have

$$
q (n) = \left\{ \begin{array}{l l} n, & \text {   if   } 1 \leqslant n \leqslant 5; \\ \lfloor \frac {4 n}{3} \rfloor , & \text {   if   } n \geqslant 6. \end{array} \right.
$$

In view of Theorem 2.1 and of the two lists just referenced, what remains is to construct, for every $n \geqslant 7 3$ , an admissible configuration with $\lfloor 4 n / 3 \rfloor$ queens. This is done in Section 4.

Theorem 2.1 has an easy corollary that settles the problem with queens attacking exactly one other. Namely, note that, with this requirement, in any admissible configuration queens can be split into pairs where queens in the same pair attack each other. Therefore, the number of queens in that case cannot be odd. And then we see that, for the optimal placement of queens in this variation, we can keep the same optimal configuration for our main problem whenever the number of queens is even, while when it is odd, we remove the single queen that does not attack any other queen. Therefore, we have the following corollary.

[[PAGE 4]]
Corollary 2.3. The maximal number of queens that can be placed on an n×n board in such a way that each of them attacks exactly on other queen equals 0, 2, 2, 4, 4 for $n = 1 , 2 , 3 , 4 , 5 .$ , respectively, and equals $\mathrm { ~ \dot { ~ } 2 ~ } [ \frac { 2 n } { 3 } ]$ for $n \geqslant 6 .$

## 3 Auxiliary constructions

We begin with four small configurations, called the hosts. In addition to being optimal, each of them leaves a strip of empty diagonals around the main diagonal. For a square in row r and column c, its distance from the main diagonal is $| r - c |$ . The clearance of a host is the smallest distance attained by one of its queens.

The four side lengths we use for the hosts are 6, 12, 15, and 18. The four hosts are shown in Figure 1. Their clearances are, respectively, 1, 2, 2, and 2. Two of them are taken from [24], namely, the $6 \times 6$ configuration and the $1 2 \times 1 2$ configuration (the first one is flipped here). The $1 5 \times 1 5$ and $1 8 \times 1 8$ configurations displayed in [9] and in [24] have queens next to the main diagonal and are therefore of no use to us. That is why we devised new ones ourselves. (Remark: it might catch an eye that $H _ { 1 8 }$ seems quite more regular than $H _ { 1 5 }$ , but there is a simple explanation for this. Both of them were, of course, found by computer. We searched for $H _ { 1 5 }$ without any restrictions on the search space, and this was the first one that appeared. Then we decided to make the algorithm faster by restricting it to look only for centrally symmetric configurations, hoping that such one existed, and indeed, this is how $H _ { 1 8 }$ was found.) That all four are admissible and have 8, 16, 20, and 24 queens is checked directly, and so is the following further piece of information, which will be needed in Subsection 3.3: the main antidiagonal of the board is empty in $H _ { 6 } ,$ in $H _ { 1 2 }$ , and in $H _ { 1 8 }$ , but not in $H _ { 1 5 }$

![](images/baec4012c49429bf5dc04cdc74adcdd98aac266b018370592d55057e1f6aa059.jpg)

![](images/6de3dfadcb879610d0761e38977fb7e139114537d09b621fba867f9ff0a6d78d.jpg)

![](images/c884b78139df6e86b129d69267bed611bf358a49acc68e1715b8000d22cfda21.jpg)  
Figure 1: The four hosts. The shaded cells are the $2 d - 1$ central diagonals, which a host must avoid.

## 3.1 Embedment

This is the main construction. We explain it in plain words. Let B be a positive integer with gcd $( B , 6 ) = 1$ . On a $B \times B$ board, put one queen in each row, namely, in row i put the queen in column 2i, with the column number read modulo B.

We claim that such queens do not attack each other, and that, moreover, the same is true even if the $B \times B$ board considered is a torus. Though this is well-known, we just sketch a proof. Namely, the column numbers run through all residues modulo B, as $2 i \equiv 2 j$ (mod B) implies $i \equiv j$ (mod B) (since $2 \nmid B )$ , and thus $i = j$ . The same is true for both diagonal directions. Namely, the queens (i, 2i) and $( j , 2 j )$ attack along one diagonal if and only if $i - 2 i \equiv j - 2 j$ (mod B), which reduces to $i \equiv j { \pmod { B } }$ , that is, $i = j$ . Finally, they attack along the other diagonal if and only if $i + 2 i \equiv j + 2 j$ (mod B), and this again reduces to $i \equiv j { \pmod { B } }$ and finally $i = j$ , where it was used that $3 \nmid B$

[[PAGE 5]]
We now replace each queen on some initial board by this toroidal pattern (the initial board will usually be one of the hosts, but the construction described here is general). Let H be an arrangement of queens on an $A \times A$ board. Divide an $A B \times A B$ board into $\bar { A } ^ { 2 }$ blocks of size $B \times B ,$ Take an occupied square of $H ,$ and let R and $C$ be its row and column. Put a translated copy of the toroidal pattern into the corresponding block. Leave the blocks belonging to empty squares empty. We denote the resulting configuration by $H [ B ]$

Theorem 3.1. Let H be an admissible configuration on an $A \times A$ board, and let B be any positive integer with gcd $( B , 6 ) = 1$ . Then the configuration $H [ B ]$ is an admissible configuration on the $A B \times A B$ board.

Proof. For $1 \leqslant R , C \leqslant A$ , let the block $( R , C )$ of the $A B \times A B$ board consist of the cells $( B ( R -$ $1 ) + i , B ( C - 1 ) + j )$ with $1 \leqslant i , j \leqslant B ,$ and let $p$ be the permutation of $\{ 1 , 2 , \ldots , B \}$ with $p ( i ) \equiv 2 i$ (mod B). The queen in the row i in the block $( R , C )$ occupies the cell $( B ( R - 1 ) + i , B ( C - 1 ) + p ( i ) )$ in $H [ B ]$ ; therefore, its diference and its sum are

$$
B (R - C) + i - p (i) \quad \text { and } \quad B (R + C - 2) + i + p (i).
$$

Note that if two queens on $H [ B ]$ have their assigned $i _ { 1 }$ and $i _ { 2 }$ distinct (also allowing R and C to vary), they cannot attack each other, as that would imply something of $i _ { 1 } \equiv i _ { 2 }$ (mod $B )$ $p ( i _ { 1 } ) \equiv p ( i _ { 2 } )$ (mod $B ) , i _ { 1 } - p ( i _ { 1 } ) \equiv i _ { 2 } - p ( i _ { 2 } )$ (mod $B )$ , or $i _ { 1 } + p ( i _ { 1 } ) \equiv i _ { 2 } + p ( i _ { 2 } )$ (mod $B )$ , all of which would mean that the queens in rows $i _ { 1 }$ and $i _ { 2 }$ attack each other on the underlying $B \times B$ torus, which is impossible. Therefore, if any two queens on $H [ B ]$ attack each other, they have to be placed in exactly the same positions within their corresponding blocks. But this implies that their line of attack gives the corresponding line of attack between the two queens at the respective positions on the initial $A \times A$ board. As H is an admissible configuration, we altogether conclude that the configuration $H [ B ]$ is also admissible. ■

Corollary 3.2. $I f 3 \mid A$ and H is an admissible configuration on an $A \times A$ board with $\frac { 4 A } { 3 }$ queens, then $H [ B ]$ is optimal on the $A B \times A B$ board.

Proof. As there are $\textstyle { \frac { 4 A } { 3 } }$ queens in H, and as each of them is replaced by B new queens in $H [ B ]$ there are $\textstyle { \frac { 4 A B } { 3 } }$ queens in $H [ B ]$ , which means that the configuration $H [ B ]$ is optimal. ■

For us the embedment is particularly useful only when the small configuration stays as far as possible from the main diagonal, because the empty strip of diagonals that this creates is what makes the extensions of Subsection 3.2 possible. Note that inside its own block a queen stays rather close to its main diagonal. Indeed, $p ( i )$ equals either 2i or $2 i - B$ , so that $i - p ( i )$ equals −i or $B - i ;$ and as i runs from 1 to B these values run through B−1 <sup>B−1</sup> , each of them once. In other 2 words, the B queens of a block occupy the B diagonals nearest to the main diagonal of the block, one queen on each. The following lemma evaluates the clearance of the configuration $H _ { A } [ B ]$

Lemma 3.3. Let $H _ { A }$ be a host and d its clearance. Let B be a positive integer with $\operatorname* { g c d } ( B , 6 ) = 1$ Then every queen $( r , c )$ of $H _ { A } [ B ]$ satisfies $| r - c | \geqslant M ( d , B )$ , where

$$
M (d, B) = d B - \frac {B - 1}{2}.
$$

In other words, the clearance of $H _ { A } [ B ]$ is at least $M ( d , B )$

Proof. The main diagonal of the block $( R , C )$ consists of the cells with diference $B ( R - C )$ , so by the preceding paragraph the diference of a queen of that block misses $B ( R - C )$ by at most ${ \frac { B - 1 } { 2 } } .$ It remains to recall that $\left| R - C \right| \geqslant d .$

Figure 2 shows $H _ { 6 }$ next to $H _ { 6 } [ 5 ]$ , an optimal configuration on the $3 0 \times 3 0$ board with 40 queens whose five central diagonals are empty, in accordance with Lemma 3.3.

[[PAGE 6]]
![](images/3f70ae90670cd465d52db0aa714d4385886353db2ffcd7d34b57adb81b31316d.jpg)  
Figure 2: The host $H _ { 6 }$ and the configuration $H _ { 6 } [ 5 ]$ ; the heavy lines mark the $5 \times 5$ blocks.

## 3.2 Extensions in the corner

The embedment produces boards of side AB only. To reach the sides between such “checkpoints” we enlarge a configuration by a few rows and columns and fill the new part with a small configuration of its own. This works as long as the two parts keep out of each other’s way, and the empty strip of diagonals provided by Lemma 3.3 is exactly what makes this possible; see Figure 3. The following proposition, the proof of which is omitted as it is obvious, formalizes this mechanism.

Proposition 3.4. Let M be a positive integer. Let Q be an admissible configuration on an $N \times N$ board all of whose queens $( r , c )$ satisfy $| r - c | \geqslant M$ , and let D be an admissible configuration on a $t \times t$ board all of whose queens $( x , y )$ sa $t i s f y \ | x - y | < M$ . Move D into the bottom right corner of an $( N + t ) \times ( N + t )$ board, that is, replace each of its queens $( x , y )$ by $( N + x , N + y )$ ). Together with Q, this gives an admissible configuration on the $( N + t ) \times ( N + t )$ board.

We shall apply this with $Q = H _ { A } [ B ]$ where the host $H _ { A }$ has clearance d, so that $N = A B$ and $M = M ( d , B )$ . If the number $\lfloor 4 t / 3 \rfloor$ of queens we want in the corner is attainable there, and if the corner configuration fits inside the strip $| x - y | < M$ , then the enlarged configuration is again optimal. Indeed, its two parts contribute $\frac { 4 { \bf \hat { \cal N } } } { 3 }$ and $\left\lfloor { \frac { 4 t } { 3 } } \right\rfloor$ queens, and since $\frac { 4 N } { 3 }$ is an integer, the total is $\lfloor \frac { 4 ( N + t ) } { 3 } \rfloor$ . Three remarks settle most of the values of t.

First, the smallest values need no search: for t = 1 we add the single queen $( N + 1 , N + 1 )$ , and for $t = 2$ the two queens $( N + 1 , N + 1 )$ and $( N + 2 , N + 2 )$

Second, if $6 \leqslant t \leqslant M$ , then any optimal configuration on a $t \times t$ board will do, since all its queens satisfy $| x - y | \leqslant t - 1 < M$ automatically.

Third, the two remaining kinds of t are genuinely diferent, and each gets a subsection below. For $t \in \{ 3 , 4 , 5 \}$ no corner configuration can help, because $q ( t ) = t$ and thus $q ( t ) < \lfloor 4 t / 3 \rfloor$ there; the enlargement has to be arranged diferently. For $t > M$ an arbitrary optimal configuration on a $t \times t$ board need not fit inside the strip, and a specially chosen one is required.

## 3.3 Splitting the new columns

Suppose we want to enlarge the board by t rows and columns, where $t \in \{ 3 , 4 , 5 \}$ . Instead of appending all the new columns on the right, we append L of them on the left and the other $t - L$ on the right, keeping all t new rows at the bottom; the old configuration is thereby shifted L columns to the right. Up to some conditions (to be formalized in the proposition that follows), this leaves enough room for $\lfloor 4 t / 3 \rfloor$ new queens instead of merely t. We use $L = 1 , 2 , 2$ for t = 3, 4, 5 and the following new queens, N being the side of the old board:

[[PAGE 7]]
![](images/62e4d61ed1da8c16c8f2879c96e37dd14bb388c4a2d22f205301b1ab5d4a077f.jpg)  
Figure 3: The corner extension. The shaded strip consists of the diagonals with $| r - c | < M :$ : it carries no queen of Q, and it contains every queen of D.

```csv
t | L the new queens
3 | 1 (N+1,1), (N+2,1), (N+3,N+2), (N+3,N+3)
4 | 2 (N+1,N+3), (N+2,1), (N+2,2), (N+3,N+4), (N+4,N+4)
5 | 2 (N+1,N+3), (N+1,N+4), (N+2,2), (N+3,1), (N+4,N+5), (N+5,N+5)
```  
There are 4, 5, and 6 of them, that is, $\lfloor 4 t / 3 \rfloor$ ; see Figure 4.

![](images/3783c2fb6ccdd595fed589480c187ae639d164eea3a8d0ea4016704954f79e40.jpg)

![](images/4ea8d3ce7db2492abd9aa5ce380c95880713adda864614ca26af8af1f15b273a.jpg)

![](images/783d164b9edc0f55e7f77a53d001bb171f18d336b198a56eb4142aa2caff1f6d.jpg)  
Figure 4: The split extension for $t = 3 , 4 , 5 .$

This idea was extensively used by Makay [17], but unfortunately, not in full generality. Namely, he was considering only the case $L = 1$ (he even mentioned the possibility of taking a larger $L ,$ but argued that this could bring no advantage; as we shall see, allowing $L = 2$ can actually have an important impact). Though he ad-hoc generated such extensions up to $t = 2 8$ , the bottleneck was the fact that such extensions were missing for $t \in \{ 4 , 6 , 7 \}$ (he actually found them to be impossible, for the form he used). All this substantially limited the eficiency of the resulting construction. Our extension for $t = 3$ is the same as Makay’s extension, but for the cases $t = 4$ and $t = 5$ we go to $L = 2 ,$ , and it turns out that this is all we need of this form: no extension with $t > 5$ will be used. (One more clarification: though there exists an extension for $t = 5$ and $L = 1$ , it is of limited usability to us; the one that we use, with $L = 2$ , is more productive.)

[[PAGE 8]]
Proposition 3.5. Let 3 | A. Let H be an admissible configuration on an $A \times A$ board with $\textstyle { \frac { 4 A } { 3 } }$ queens, having no queen on either of the two main diagonals. Let B be an integer with $B \geqslant 5$ and gcd $( B , 6 ) \ = \ 1$ , let $t \in \{ 3 , 4 , 5 \}$ , and put $N \ = \ A B$ . Then the queens of $H [ B ]$ , shifted L columns to the right, together with the new queens listed above, form an optimal configuration on the $( N + t ) \times ( N + t )$ board.

Proof. The number of queens is right, so only admissibility is at issue. Old and new queens occupy disjoint sets of rows, and also disjoint sets of columns, so only diferences and sums can cause trouble.

Among the new queens there is nothing to check beyond what the table shows: for $t = 3$ a pair in a column and a pair in a row; for $t = 4$ a pair in a row, a pair in a column, and one queen meeting nobody; for $t = 5 \mathrm { ~ a ~ }$ pair in a row, a pair on an antidiagonal, and a pair in a column. Apart from these occasions, the four numbers of the new queens are pairwise diferent, which one read of the table at a glance.

It remains to check that an old and a new queen never attack each other. Clearly, this is never the case for horizontal and vertical attacks, so it remains to take care of diagonal attacks.

Note that all the new queens in the right-hand columns belong to the extension of either the main diagonal of $H [ B ]$ , or a diagonal at distance at most 2 from the main diagonal. As the clearance of H is at least 1 (since it was assumed that H has no queens on the main diagonal), Lemma 3.3 gives that the clearance of $H [ B ]$ is at least 3. Therefore, we conclude that none of the new queens in the right-hand columns attack an old queen.

Regarding the new queens in the left-hand columns, we note the following. The main antidiagonal of $H [ B ]$ is empty, as well as the antidiagonal immediately below it. The first claim follows as the main antidiagonal of H is empty (by the assumption), and the second claim follows by the same observation, together with additionally acknowledging that the cell (1, 1) is empty in our $B \times B$ board. This completes the proof. ■

Of our four hosts, $H _ { 6 } , \ H _ { 1 2 }$ , and $H _ { 1 8 }$ have both main diagonals empty, as recorded in the beginning of Section 3, and Proposition 3.5 applies to them. The host $H _ { 1 5 }$ does not qualify, and we cannot simply replace it by a better $1 5 \times 1 5$ host, since its clearance $d = 2$ is needed elsewhere. Instead we keep a second $1 5 \times 1 5$ configuration for this one purpose, namely the one drawn in Figure 5. It is optimal, and both of its main diagonals are empty, so Proposition 3.5 does apply to it. Its clearance is only 1, and this is why the two $1 5 \times 1 5$ configurations are kept side by side: $H _ { 1 5 }$ serves the extensions of Proposition 3.4, and $H _ { 1 5 } ^ { \prime }$ those of Proposition 3.5. (Of course, it would be nice to have a unique $1 5 \times 1 5$ configuration that serves both purposes: that is, that has clearance 2, and empty main antidiagonal. However, such a configuration does not exist, we checked exhaustively.)

## 3.4 Four corner configurations close to the diagonal

Proposition 3.4 asks the corner configuration to satisfy $| x - y | < M$ , and for $t > M$ this has to be arranged by hand. Only the values $8 \leqslant t \leqslant 1 1$ , with $M \geqslant 7 .$ , will occur in Section 4, and for these we use the configurations $C _ { 8 } , C _ { 9 } , C _ { 1 0 } , C _ { 1 1 }$ drawn in Figure 6. They have 10, 12, 13, and 14 queens (that is, $\lfloor 4 t / 3 \rfloor$ in each case), they are admissible, and each of them satisfies $| x - y | \leqslant 6$ . So by Proposition 3.4 any of them may be put in the corner of a configuration whose clearance M is at least 7. Of the four, $C _ { 8 }$ is the $8 \times 8$ configuration of [24] and $C _ { 9 }$ is its $9 \times 9$ configuration reflected; the $1 0 \times 1 0$ and $1 1 \times 1 1$ configurations displayed there have queens with $| x - y | = 8$ and would not do.

## 4 Proof of the main theorem

It remains to produce an optimal configuration on an $n \times n$ board for every n from 73 onward. Everything we have prepared is summarized in the following lemma which says what one block of the construction yields: from a host $H _ { A }$ and a multiplier B we obtain a whole interval of board sides, beginning at AB.

[[PAGE 9]]
![](images/1ffcdd62281e2727c9f83955f46a04a7ed8188c32ffd031d6809a72732ca39a5.jpg)  
Figure 5: The configuration $H _ { 1 5 } ^ { \prime }$ . The shaded cells form the two main diagonals, which Proposition 3.5 requires to be empty.

![](images/190be86c8565ff6e3ed3b06b290ee706679d6b78d7b165354cf453086f366b17.jpg)

![](images/44bae3f39eae95a6e9c550e8520b266a951d7c1037938eecfd668d5a09adc2ea.jpg)  
C<sub>9</sub>

![](images/9cbd011038d189fff5d1ffc0e15f2fbdcf66127ed90a151184a71f0eadc20399.jpg)  
C<sub>10</sub>

![](images/4446ed77ec0f672f5d398ebadfa3e4d20c5f784879560a0a1947334fb7de8946.jpg)  
C<sub>11</sub>  
Figure 6: The corner configurations $C _ { 8 } , C _ { 9 } , C _ { 1 0 }$ , and $C _ { 1 1 }$ . The shaded cells are those with $| x - y | \geqslant 7 .$

Lemma 4.1. Let $A \in \{ 6 , 1 2 , 1 5 , 1 8 \}$ , let d be the clearance of the host $H _ { A }$ , and let B be an integer with $B \geqslant 5$ and $\operatorname* { g c d } ( B , 6 ) = 1$ . Put $N = A B$ and $M = M ( d , B )$ , and assume $M \geqslant 7$ . If $q ( t ) = \lfloor 4 t / 3 \rfloor$ for every t with $\dot { \rangle } \leqslant t \leqslant M$ , then

$$
q (n) = \left\lfloor \frac {4 n}{3} \right\rfloor \quad \text {   for   every   } n \text {   with   } N \leqslant n \leqslant N + \max \{M, 1 1 \}.
$$

Proof. Write $n = N + t .$ . By Corollary 3.2 and Lemma 3.3, the configuration $H _ { A } [ B ]$ is optimal on the $N \times N$ board and all its queens satisfy $| r - c | \geqslant M$ , so Proposition 3.4 may be applied to it with any corner configuration lying inside the strip $| x - y | < M$ . For $t = 0$ there is nothing to add, and $t = 1 , t = 2$ were dealt with near the end of Subsection 3.2.

For $t \in \{ 3 , 4 , 5 \}$ we use Proposition 3.5 instead, with $H _ { A } { \mathrm { ~ i f ~ } } A \neq 1 5$ and with $H _ { 1 5 } ^ { \prime }$ if $A = 1 5$ For $6 \leqslant t \leqslant M$ we put an optimal configuration on a $t \times t$ board in the corner; by assumption it has $\lfloor 4 t / 3 \rfloor$ queens, and it fits inside the strip. There remain the values of t with $M < t \leqslant 1 1 ;$ as $M \geqslant 7 .$ such a t satisfies $8 \leqslant t \leqslant 1 1$ , and we put $C _ { t }$ in the corner, which is allowed because, for any queen $( x , y )$ on $C _ { t } ,$ we have $| x - y | \leqslant 6 < 7 \leqslant M$

In each case the resulting configuration is admissible and has $\lfloor { \frac { 4 n } { 3 } } \rfloor$ queens, as counted after Proposition 3.4, so it is optimal by Theorem 2.1. ■

## 4.1 The sides 73 and 74

Lemma 4.1 does not reach 73 and 74. Indeed, since $B \geqslant 5$ , the products AB not exceeding 74 are 30, 42, and 66 for $A = 6 ,$ and 60 for $A = 1 2 .$ , and there are none for $A = 1 5$ and $A = 1 8 ;$ the corresponding clearances are 3, 4, 6, and 8. The first three are below 7, so Lemma 4.1 is unavailable for them, and Proposition 3.4 by itself pushes 66 up to at most $^ { 7 2 ; }$ the last product is pushed up to at most 71.

[[PAGE 10]]
![](images/e1f34781108041f2f53212cdcd98f6a15d0eaf77ab7ddab5e75e25d16dd43376.jpg)

So we start from $H _ { 6 } [ 1 1 ]$ (which is an optimal configuration on the $6 6 \times 6 6$ board with 88 queens), and place it inside a larger board so that an empty frame is left around it. For $n = 7 3$ we shift $H _ { 6 } [ 1 1 ]$ four rows down and four columns to the right, so that it occupies the rows and the columns $5 , 6 , \ldots , 7 0$ , and add the nine queens

$$
\{(1, 2), (1, 7 1), (2, 4), (3, 1), (4, 3), (4, 7 2), (7 1, 4), (7 2, 1), (7 3, 7 3) \},
$$

all of which lie in the frame. For $n = 7 4$ we shift $H _ { 6 } [ 1 1 ]$ four rows down and five columns to the right and add the ten queens

$$
\{(1, 4), (2, 7 2), (3, 7 4), (4, 3), (4, 5), (7 1, 2), (7 1, 7 3), (7 2, 4), (7 3, 1), (7 4, 7 4) \}.
$$

This is illustrated in Figure 7. Both configurations are admissible, as a direct check shows. The first one has 97 queens and the second one 98, which are the respective values of $\lfloor 4 n / 3 \rfloor$ ; hence $q ( 7 3 ) = 9 7$ and $q ( 7 4 ) = 9 8$

Remark 4.2. Basically, what we did here, is that our $H _ { 6 } [ 1 1 ]$ configuration is extended to the size $+ 7 ,$ respectively +8. This is not a specific property of $H _ { 6 } [ 1 1 ]$ ; the same patches work for some other boards too, and furthermore, similar patches can be designed to obtain $+ 6 , + 9 , + 1 0$ , and +11 extensions of various boards. Everything together can handle all the values from $n = 3 1$ onward, with the following exceptions: $n \in \{ 3 9 , 4 0 , 5 4 , 5 5 , 5 6 , 5 9 \}$ }. As explained in Introduction, once the table [9] appeared, we decided to abandon this path and instead present the work in a more clear manner, settling the cases from $n = 7 3$ onward.

![](images/52cbfbf0befa0ae600ab60ad3acbd090830345c210e0ae89070a84e8ad37582c.jpg)  
Figure 7: Optimal configurations on the $7 3 \times 7 3$ and $7 4 \times 7 4$ boards; only the four corners of each board are drawn. The shaded cells are those of the shifted copy of $H _ { 6 } [ 1 1 ]$

## 4.2 The range $7 5 \leqslant n \leqslant 2 8 1$

Here we handle what the subsection title says.

Lemma 4.3. We have $q ( n ) = \lfloor 4 n / 3 \rfloor$ for every n with $7 5 \leqslant n \leqslant 2 8 1$

Proof. Each row of the table below is one application of Lemma 4.1; the last column is the interval

[[PAGE 11]]
[AB, $A B + \operatorname* { m a x } \{ M , 1 1 \} ]$ that the row delivers.

<table><tr><td>A</td><td>B</td><td>N = AB</td><td>M</td><td>sides obtained</td></tr><tr><td>15</td><td>5</td><td>75</td><td>8</td><td>75–86</td></tr><tr><td>6</td><td>13</td><td>78</td><td>7</td><td>78–89</td></tr><tr><td>18</td><td>5</td><td>90</td><td>8</td><td>90–101</td></tr><tr><td>6</td><td>17</td><td>102</td><td>9</td><td>102–113</td></tr><tr><td>6</td><td>19</td><td>114</td><td>10</td><td>114–125</td></tr><tr><td>18</td><td>7</td><td>126</td><td>11</td><td>126–137</td></tr><tr><td>12</td><td>11</td><td>132</td><td>17</td><td>132–149</td></tr><tr><td>6</td><td>25</td><td>150</td><td>13</td><td>150–163</td></tr><tr><td>12</td><td>13</td><td>156</td><td>20</td><td>156–176</td></tr><tr><td>6</td><td>29</td><td>174</td><td>15</td><td>174–189</td></tr><tr><td>6</td><td>31</td><td>186</td><td>16</td><td>186–202</td></tr><tr><td>18</td><td>11</td><td>198</td><td>17</td><td>198–215</td></tr><tr><td>12</td><td>17</td><td>204</td><td>26</td><td>204–230</td></tr><tr><td>6</td><td>37</td><td>222</td><td>19</td><td>222–241</td></tr><tr><td>18</td><td>13</td><td>234</td><td>20</td><td>234–254</td></tr><tr><td>15</td><td>17</td><td>255</td><td>26</td><td>255–281</td></tr></table>

Every B occurring here satisfies $\operatorname* { g c d } ( B , 6 ) = 1$ and $B \geqslant 5 ,$ , and every M is at least 7, so Lemma 4.1 is indeed applicable, provided that $q ( t ) = \lfloor 4 t / 3 \rfloor$ for the relevant auxiliary sides t. These satisfy $6 \leqslant t \leqslant 2 6 .$ and for such t the required configurations are listed in [24].

It remains to observe that the sixteen intervals in the last column cover $\{ 7 5 , 7 6 , \dots , 2 8 1 \}$ , which they do: each of them begins before or immediately after the previous one ends. ■

## 4.3 The sides n ⩾ 282

From here on the host $H _ { 6 }$ alone sufices, as the intervals produced by Lemma 4.1 leave no gaps. This is more formally presented in the following two lemmas.

Lemma 4.4. Every integer n, n ⩾ 282, lies in one of the intervals

$$
[ 3 6 k - 6, 3 9 k - 6 ], \qquad [ 3 6 k + 6, 3 9 k + 7 ] \qquad (f o r k \geqslant 8),
$$

which are the intervals delivered by Lemma 4.1 for $A = 6$ and $B = 6 k - 1$ , respectively $B = 6 k + 1$

Proof. Both choices of B are coprime to 6. For $B = 6 k - 1$ we have $N = 6 B = 3 6 k - 6$ and

$$
M (1, B) = B - \frac {B - 1}{2} = \frac {B + 1}{2} = 3 k,
$$

which for $k \geqslant 8$ exceeds 11; so Lemma 4.1 delivers the sides from $3 6 k - 6$ to $3 9 k - 6$ . For $B = 6 k + 1$ we get $N = 3 6 k + 6$ and $M ( 1 , B ) = 3 k + 1$ , hence the sides from $3 6 k + 6$ to $3 9 k + 7$

Consecutive intervals of the sequence $[ 3 6 \cdot 8 - 6 , 3 9 \cdot 8 - 6 ] , \ [ 3 6 \cdot 8 + 6 , 3 9 \cdot 8 + 7 ] , \ [ 3 6 \cdot 9 - 6 , 3 9 \cdot 9 - 6 ] , \ . \ . \nonumber$ overlap or immediately follow one another, because for $k \geqslant 8$ we have

$$
(3 9 k - 6) + 1 \geqslant 3 6 k + 6 \quad \text { and } \quad (3 9 k + 7) + 1 \geqslant 3 6 (k + 1) - 6;
$$

indeed, these inequalities are equivalent to $3 k \geqslant$ 11 and 3k ⩾ 22. The first interval of the sequence is [282, 306], so their union is [282, ∞). ■

Lemma 4.5. We have $q ( n ) = \lfloor 4 n / 3 \rfloor$ whenever n $\geqslant 2 8 2$

Proof. We argue by strong induction on n. By the arguments up to Subsection 4.2, the assertion holds for every side between 6 and 281.

Let $n \geqslant 2 8 2$ and assume that the assertion holds for all smaller sides. Choose $k \geqslant 8$ and $B = 6 k \pm 1$ such that n belongs to the corresponding interval of Lemma 4.4 (or to any such one, if there is a choice), and put $M = M ( 1 , B )$ , which is 3k or $3 k + 1$ . As $B \geqslant 4 7$ and $M \geqslant 2 4$ , Lemma 4.1 may be applied to $A = 6$ and this $B ,$ provided that $q ( t ) = \lfloor 4 t / 3 \rfloor$ for $6 \leqslant t \leqslant M$ ; and this is guaranteed by the induction hypothesis, since $M < 3 6 k - 6 \leqslant n$ ■

[[PAGE 12]]
Finally, we are ready to sum up everything.

Proof of Theorem 2.2. The upper bound $q ( n ) \leqslant \lfloor 4 n / 3 \rfloor$ is Theorem 2.1, and $q ( n ) = n$ for $n \leqslant 5$ was noted in Section 2. The bound is attained for $6 \leqslant n \leqslant 7 2$ by the configurations of [9], for $n = 7 3$ and $n = 7 4$ by the two configurations of Subsection 4.1, for $7 5 \leqslant n \leqslant 2 8 1$ by Lemma 4.3, and for n $\geqslant$ 282 by Lemma 4.5. ■

## Acknowledgments

The authors were supported by the Ministry of Science, Technological Development and Innovation of the Republic of Serbia (grants no. 451-03-33/2026-03/200125 and 451-03-34/2026-03/200125 for the first two authors, and grant no. 451-03-34/2026-03/200156 for the third author).

## References

[1] W. Ahrens, Mathematische Unterhaltungen und Spiele, Vol. 1, 2nd ed., B. G. Teubner, Leipzig, 1910.

[2] J. Bell & B. Stevens, A survey of known results and research areas for n-queens, Discrete Math. 309 (2009), 1–31.

[3] M. Bezzel, Zwei Schachfragen, Schachzeitung 3 (1848), 363.

[4] C. Bowtell & P. Keevash, The n-queens problem, preprint (2021), arXiv:2109.08083.

[5] P. J. Campbell, Gauss and the eight queens problem: a study in miniature of the propagation of historical error, Historia Math. 4 (1977), 397–404.

[6] M. Gardner, Mathematical games: The inspired geometrical symmetries of Scott Kim, Scientific American 244 (1981), 22–31.

[7] Е. Я. Гик, Математика на шахматной доске, Nauka, Moscow, 1976.

[8] P. Hayes, A problem of chess queens, J. Recreational Math. 24 (1992), 264–271.

[9] A. D. Healy, Examples of optimal placements for n ⩽ 72, https://oeis.org/A260113/a260113\_1.pdf.

[10] A. D. Healy, Proof that $a ( n ) = \lfloor 4 n / 3 \rfloor$ for n ⩾ 6, https://alexhealy.net/papers/queens.pdf.

[11] J. T. Hedetniemi & S. T. Hedetniemi, Domination in chessboards, in: T. W. Haynes & S. T. Hedetniemi & M. A. Henning (eds.), Structures of Domination in Graphs, Springer, Cham, 2021, pp. 341–386.

[12] IBM Research, Ponder This Challenge, August 2008, https://research.ibm.com/haifa/ponderthis/challenges/August2008.html.

[13] S. Kim, Problem 811, J. Recreational Math. 12 (1979), 53.

[14] F. Lionnet, Question 963, Nouvelles Annales de Math\`ematiques 8 (1869), 560.

[15] Z. Luria, New bounds on the number of n-queens configurations, preprint (2017), arXiv:1705.05225.

[16] Z. Luria & M. Simkin, A lower bound for the n-queens problem, in: J. Naor & N. Buchbinder (eds.), Proceedings of the 2022 Annual ACM-SIAM Symposium on Discrete Algorithms (SODA 2022), SIAM, Philadelphia, 2022, pp. 2185–2197.

[17] G. Makay, Kir´alyn˝ok a sakkt´abl´an, Erint˝o: Elektronikus Matematikai Lapok<sup>´</sup> 34 (2024), 8 pp.

[18] Mathematical Society of Serbia, Serbian Mathematical Olympiad 2017 for High School Students, Belgrade, 2017, https://imomath.com/srb/zadaci/2017\_smo\_booklet.pdf.

[[PAGE 13]]
[19] F. Nauck, Schach: Eine in das Gebiet der Mathematik fallende Aufgabe, Illustrirte Zeitung 14, No. 361 (1 June 1850), 352.

[20] P. Nobel & A. Agrawal & S. Boyd, Computing tighter bounds on the n-queens constant via Newton’s method, Optim. Lett. 17 (2023), 1229–1240.

[21] OEIS Foundation Inc., Sequence A260113, The On-Line Encyclopedia of Integer Sequences, https://oeis.org/A260113.

[22] E. Pauls, Das Maximalproblem der Damen auf dem Schachbrete, Deutsche Schachzeitung 29 (1874), 129–134 and 257–267.

[23] G. P´olya, Uber die “doppelt-periodischen” L¨osungen des<sup>¨</sup> n-Damen-Problems, in: W. Ahrens, Mathematische Unterhaltungen und Spiele, Vol. 2, 2nd ed., B. G. Teubner, Leipzig, 1918, pp. 364–374.

[24] G. Resta, Illustration of a(6)–a(30), https://oeis.org/A260113/a260113.pdf.

[25] I. Rivin & I. Vardi & P. Zimmermann, The n-queens problem, Amer. Math. Monthly 101 (1994), 629–639.

[26] M. Simkin, The number of n-queens configurations, Adv. Math. 434 (2023), Paper No. 109127, 49 pp.

[27] J. J. Watkins, Across the Board: The Mathematics of Chessboard Problems, Princeton University Press, Princeton, 2004.
