import { Component } from "react";

// Generic React error boundary. Class component because React only exposes
// getDerivedStateFromError/componentDidCatch on classes — there's no hook
// equivalent. Pass `fallback` (a node, or a function receiving the error) to
// control what renders in place of the crashed subtree.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (error) {
      const { fallback } = this.props;
      return typeof fallback === "function" ? fallback(error) : fallback ?? null;
    }
    return this.props.children;
  }
}
