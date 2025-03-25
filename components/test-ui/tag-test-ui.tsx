"use client"

import React, { useState } from 'react';
import { createTagTestSuite, TagTestResult } from '@/lib/testing-utils/tag-testing';
import { Button } from '@/components/ui/button';
import { 
  Check, 
  X, 
  Play, 
  PlayCircle, 
  Clipboard, 
  FileText,
  Tag as TagIcon,
  AlertTriangle
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface TagTestUIProps {
  editor: any;
}

export function TagTestUI({ editor }: TagTestUIProps) {
  const [results, setResults] = useState<TagTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [reportCopied, setReportCopied] = useState(false);
  
  // Create the test suite
  const testSuite = createTagTestSuite(editor);
  
  // Run all tests
  const runAllTests = async () => {
    setIsRunning(true);
    const results = await testSuite.runAllTests();
    setResults(results);
    setIsRunning(false);
  };
  
  // Run a specific test
  const runTest = async (testFn: () => Promise<TagTestResult>) => {
    setIsRunning(true);
    const result = await testFn();
    setResults(prev => [...prev, result]);
    setIsRunning(false);
    return result;
  };
  
  // Clear results
  const clearResults = () => {
    setResults([]);
  };
  
  // Generate and copy report
  const copyReport = () => {
    const report = testSuite.generateReport();
    navigator.clipboard.writeText(report);
    setReportCopied(true);
    
    setTimeout(() => {
      setReportCopied(false);
    }, 2000);
  };
  
  // Count passed tests
  const passedCount = results.filter(r => r.success).length;
  
  return (
    <div className="border border-border rounded-md p-4 bg-background/50">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <TagIcon className="h-5 w-5 text-primary" />
          Tag System Tests
        </h2>
        
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={runAllTests}
            disabled={isRunning}
            className="gap-1"
          >
            <PlayCircle className="h-4 w-4" />
            Run All Tests
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={clearResults}
            disabled={isRunning || results.length === 0}
            className="gap-1"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
          
          {results.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={copyReport}
              className="gap-1"
            >
              <Clipboard className="h-4 w-4" />
              {reportCopied ? 'Copied!' : 'Copy Report'}
            </Button>
          )}
        </div>
      </div>
      
      {/* Test summary */}
      {results.length > 0 && (
        <div className="mb-4 p-3 border border-border rounded-md bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-sm">
                <span className="font-medium">Tests run:</span> {results.length}
              </div>
              <div className="text-sm text-green-600 dark:text-green-400">
                <span className="font-medium">Passed:</span> {passedCount}
              </div>
              <div className="text-sm text-red-600 dark:text-red-400">
                <span className="font-medium">Failed:</span> {results.length - passedCount}
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              {passedCount === results.length ? (
                <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <Check className="h-4 w-4" />
                  All tests passed
                </div>
              ) : (
                <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  Some tests failed
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Individual test buttons */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => runTest(testSuite.testInlineTagCreation)}
          disabled={isRunning}
          className="text-xs justify-start"
        >
          <Play className="h-3.5 w-3.5 mr-2" />
          Test Inline Tag Creation
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => runTest(testSuite.testDocumentTagCreation)}
          disabled={isRunning}
          className="text-xs justify-start"
        >
          <Play className="h-3.5 w-3.5 mr-2" />
          Test Document Tag Creation
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => runTest(testSuite.testTagSearch)}
          disabled={isRunning}
          className="text-xs justify-start"
        >
          <Play className="h-3.5 w-3.5 mr-2" />
          Test Tag Search
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => runTest(testSuite.testTagRemoval)}
          disabled={isRunning}
          className="text-xs justify-start"
        >
          <Play className="h-3.5 w-3.5 mr-2" />
          Test Tag Removal
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => runTest(testSuite.testPropertiesPanel)}
          disabled={isRunning}
          className="text-xs justify-start"
        >
          <Play className="h-3.5 w-3.5 mr-2" />
          Test Properties Panel
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => runTest(testSuite.testPerformance)}
          disabled={isRunning}
          className="text-xs justify-start"
        >
          <Play className="h-3.5 w-3.5 mr-2" />
          Test Performance
        </Button>
      </div>
      
      {/* Test results */}
      {results.length > 0 && (
        <>
          <Separator className="my-4" />
          
          <h3 className="text-sm font-medium mb-2">Test Results</h3>
          
          <Accordion type="single" collapsible className="w-full">
            {results.map((result, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="hover:no-underline py-2">
                  <div className="flex items-center gap-3 text-sm">
                    <div className={`h-5 w-5 rounded-full flex items-center justify-center ${
                      result.success ? 'bg-green-500/20' : 'bg-red-500/20'
                    }`}>
                      {result.success ? (
                        <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <span>{result.message}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pl-8 pr-4 pb-2">
                    <pre className="text-xs p-3 bg-muted/30 rounded-md overflow-x-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </>
      )}
      
      {/* Empty state */}
      {results.length === 0 && !isRunning && (
        <div className="p-6 text-center text-muted-foreground flex flex-col items-center">
          <FileText className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm">Run tests to validate the tagging system</p>
        </div>
      )}
      
      {/* Loading state */}
      {isRunning && (
        <div className="p-6 text-center text-muted-foreground flex flex-col items-center">
          <div className="flex justify-center mb-3">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
          </div>
          <p className="text-sm">Running tests...</p>
        </div>
      )}
    </div>
  );
}
