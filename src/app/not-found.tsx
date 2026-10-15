// Next renders app/not-found.tsx for a URL that matches no route, so it has to
// exist outside the (frontend) route group as well. The route group keeps the
// same component for notFound() calls inside the group.
export { default } from './(frontend)/not-found'
