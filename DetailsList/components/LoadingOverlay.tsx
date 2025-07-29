import * as React from 'react';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { ProgressIndicator } from '@fluentui/react/lib/ProgressIndicator';

export interface ILoadingOverlayProps {
    message?: string;
    showProgressBar?: boolean;
    progress?: number; // 0-1 for progress bar
    isVisible?: boolean;
    theme?: string;
}

export const LoadingOverlay: React.FC<ILoadingOverlayProps> = ({
    message = 'Loading...',
    showProgressBar = false,
    progress,
    isVisible = true,
    theme = 'light'
}) => {
    if (!isVisible) {
        return null;
    }

    return (
        <div className={`loading-overlay ${theme}`}>
            <div className="loading-spinner-container">
                {/* Spinner */}
                <Spinner 
                    size={SpinnerSize.large} 
                    styles={{
                        root: {
                            margin: '0 auto'
                        },
                        circle: {
                            borderTopColor: 'var(--themePrimary, #0078d4)',
                            borderRightColor: 'var(--themePrimary, #0078d4)',
                            borderBottomColor: 'var(--themePrimary, #0078d4)',
                            borderLeftColor: 'var(--neutralQuaternary, #d2d0ce)'
                        }
                    }}
                />
                
                {/* Loading Message */}
                <div className="loading-message">
                    {message}
                </div>
                
                {/* Optional Progress Bar */}
                {showProgressBar && (
                    <div className="loading-progress-bar">
                        <ProgressIndicator
                            percentComplete={progress}
                            styles={{
                                progressBar: {
                                    backgroundColor: 'var(--themePrimary, #0078d4)'
                                },
                                progressTrack: {
                                    backgroundColor: 'var(--neutralQuaternary, #d2d0ce)'
                                }
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default LoadingOverlay;
