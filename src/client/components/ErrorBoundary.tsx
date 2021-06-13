import React, { ErrorInfo } from "react";
import { Button } from "./ui/Button";

interface State {
  hasError: boolean;
}

// https://reactjs.org/docs/error-boundaries.html
export class ErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
    errorContent?: React.ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
  },
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
    this.props.onError?.(error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.errorContent !== undefined) {
        return this.props.errorContent;
      }

      return (
        <>
          <h1>An error occurred.</h1>
          <Button onClick={() => this.setState({ hasError: false })}>
            retry
          </Button>
        </>
      );
    }

    return this.props.children;
  }
}
