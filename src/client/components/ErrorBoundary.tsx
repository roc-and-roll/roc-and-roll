import React, { ErrorInfo } from "react";

interface State {
  hasError: boolean;
}

// https://reactjs.org/docs/error-boundaries.html
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(error);
    console.error(errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <>
          <h1>An error occurred.</h1>
          <button onClick={() => this.setState({ hasError: false })}>
            retry
          </button>
        </>
      );
    }

    return this.props.children;
  }
}
