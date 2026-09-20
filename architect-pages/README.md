# architect-pages — empty on purpose

This is where this service's own pages will live: the presentation page a buyer sees before
installing, and the build pages that let the architect of a node reshape the service without touching
the node.

**It is empty today, and that is the state the owner asked for:** the pages are a separate step. The
folder exists now so that adding them later does not mean reopening the repository and changing its
shape for everyone who already installed it.

## The rule that decides what may go here

Pages in this folder are **data**, not Next routes. The node mounts them; it does not scan for them.
A route that appeared and disappeared together with an install would break the node's prerendering
quietly — the kind of failure nobody notices until search traffic drops.

## The border that must survive

For this service in particular the border is sharper than elsewhere, because it guards data.

Build pages may change what is **inside**: which tables exist, what a collection means, how media is
processed. They may never change what is **outside**: the address, the `X-Data-Secret` contract, the
shape of the answers, or the rule that `/health` is the only door without a key. That outside is what
makes this service replaceable — and what keeps the data behind exactly one lock.
