
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';

const QualityParametersTable = () => {
  const parameters = [
    {
      parameter: 'Moisture',
      description: 'Water content in coffee beans. Optimal range is 10-12%. Higher moisture can lead to mold and quality degradation.',
      unit: '%',
      optimalRange: '10-12%',
      impact: 'High moisture reduces price'
    },
    {
      parameter: 'Group 1 Defects',
      description: 'Primary defects including black beans, sour beans, pod/cherry, fungus damage, foreign matter, severe insect damage.',
      unit: '%',
      optimalRange: '<5%',
      impact: 'Significantly reduces price'
    },
    {
      parameter: 'Group 2 Defects',
      description: 'Secondary defects including partial black, partial sour, parchment, floater, immature, withered, shell, broken/chipped.',
      unit: '%',
      optimalRange: '<10%',
      impact: 'Moderately reduces price'
    },
    {
      parameter: 'Below 12 Screen',
      description: 'Percentage of beans that pass through a 12/64 inch screen. Indicates small bean size which affects quality grading.',
      unit: '%',
      optimalRange: '<10%',
      impact: 'Affects grade classification'
    },
    {
      parameter: 'Pods',
      description: 'Dried coffee cherries that were not properly processed. Indicates poor processing or harvesting practices.',
      unit: '%',
      optimalRange: '<1%',
      impact: 'Reduces quality grade'
    },
    {
      parameter: 'Husks',
      description: 'Dried parchment or hull remnants mixed with the coffee beans. Shows incomplete processing.',
      unit: '%',
      optimalRange: '<1%',
      impact: 'Reduces quality grade'
    },
    {
      parameter: 'Stones',
      description: 'Small stones or mineral matter mixed with coffee beans. Foreign matter that affects final product quality.',
      unit: '%',
      optimalRange: '<0.5%',
      impact: 'Significantly reduces price'
    },
    {
      parameter: 'Final Price',
      description: 'Total payment amount calculated based on weight (kg) × price per kg, adjusted for quality parameters and market rates.',
      unit: 'UGX',
      optimalRange: 'Market dependent',
      impact: 'Based on quality assessment'
    }
  ];

  const getImpactBadge = (impact: string) => {
    if (impact.includes('Significantly')) {
      return <Badge variant="destructive" className="text-xs">{impact}</Badge>;
    } else if (impact.includes('Moderately')) {
      return <Badge variant="secondary" className="text-xs">{impact}</Badge>;
    } else if (impact.includes('quality')) {
      return <Badge variant="outline" className="text-xs">{impact}</Badge>;
    } else {
      return <Badge variant="default" className="text-xs">{impact}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Quality Assessment Parameters Guide
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Parameter</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Optimal Range</TableHead>
              <TableHead>Price Impact</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parameters.map((param, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{param.parameter}</TableCell>
                <TableCell className="text-sm max-w-md">{param.description}</TableCell>
                <TableCell className="text-center">{param.unit}</TableCell>
                <TableCell className="text-center font-medium">{param.optimalRange}</TableCell>
                <TableCell>{getImpactBadge(param.impact)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default QualityParametersTable;
