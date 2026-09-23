//
//  Author: Fabian Rostello
//  Date: 19.05.2026
//  File: FeedList.jsx
//  Description: FeedList component used in Search Page
//

import {List, Box, Table, Loader, VStack, toaster, Message, Text, Button, SelectPicker, HStack, Tag, } from "rsuite";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {FaMagic} from "react-icons/fa";
import {Article} from "../article/Article.jsx";
import {VscFilter, VscFilterFilled} from "react-icons/vsc";
import {TbFilter, TbFilterOff} from "react-icons/tb";


const { Column, HeaderCell, Cell } = Table;

export const FeedList = ({newsList, onGenerate, isGenerating, wider, onWiden}) => {
    const selectedIds = useRef([]);
    const [selectedCount, setSelectedCount] = useState(0);
    const [filteredData, setFilteredData] = useState(newsList);
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [sourceFilter, setSourceFilter] = useState(null);
    const [timeFilter, setTimeFilter] = useState(null);
    const [coverageFilter, setCoverageFilter] = useState(null);
    const [wordingFilter, setWordingFilter] = useState(null);

    const handleSelect = useCallback((id, checked) => {
        if (checked) {
            if (selectedIds.current.length >= 10) {
                toaster.push(<Message type="error">10 articles max.</Message>);
                return false;
            }
            selectedIds.current = [...selectedIds.current, id];
        } else {
            selectedIds.current = selectedIds.current.filter(s_id => s_id !== id);
        }

        setSelectedCount(selectedIds.current.length);
        return true;
    }, []);

    // Filter values
    const getSources = () => {
        const sources = [...new Set(newsList.map(item => item.source))].sort();
        return sources.map(source => ({ label: source, value: source }));
    };

    // Filters on what the grouping measured. None of them says a news is true: 'several' only means
    // several media carry it, and a rumour carried by twenty media is still a rumour.
    const COVERAGE = {
        several: item => item.corroboration?.media > 1,
        wordings: item => item.corroboration?.wordings > 1,
        alone: item => (item.corroboration?.media ?? 1) === 1,
    };

    // the hedging words actually present in these results, so the user can ask for one of them
    // rather than for a category we would have invented
    const getWordings = () => {
        const found = [...new Set(newsList.map(item => item.hedged).filter(Boolean))].sort();
        return [
            { label: 'Any of these words', value: '*' },
            ...found.map(word => ({ label: `"${word}"`, value: word })),
        ];
    };

    const applyFilters = () => {
        let result = [...newsList];

        // Apply source filter
        if (sourceFilter) {
            result = result.filter(item => item.source === sourceFilter);
        }

        // Apply coverage filter: how widely the news is carried
        if (coverageFilter) {
            result = result.filter(COVERAGE[coverageFilter]);
        }

        // Apply wording filter: the articles saying themselves they have no confirmation
        if (wordingFilter) {
            result = result.filter(item => wordingFilter === '*' ? item.hedged : item.hedged === wordingFilter);
        }

        // Apply time filter
        // Aide Claude IA: how to sort iso time
        if (timeFilter) {
            result.sort((a, b) => {
                const dateA = new Date(a.publishedAt).getTime();
                const dateB = new Date(b.publishedAt).getTime();
                return timeFilter === 'asc' ? dateA - dateB : dateB - dateA;
            });
        }
        setFilteredData(result);
        setShowFilterPanel(false);
    };

    const clearFilters = () => {
        setSourceFilter(null);
        setTimeFilter(null);
        setCoverageFilter(null);
        setWordingFilter(null);
        setFilteredData(newsList);
    };

    const countActiveFilters = () => {
        return [sourceFilter, timeFilter, coverageFilter, wordingFilter].filter(Boolean).length;
    };

    useEffect(() => {
        setFilteredData(newsList);
    }, [newsList]);

    // The table holds every card of the list, 200 and more of them. Selecting one changes
    // 'selectedCount', which renders this component again: without these two, a new renderRow is
    // built each time and the table walks all its rows again, which took 3 seconds a click.
    // Kept apart, the table is only rebuilt when the news themselves change.
    const renderRow = useCallback((children, rowData) => (
        <Box padding={20}>
            <Article id={rowData.url} onSelect={handleSelect} news={rowData}/>
        </Box>
    ), [handleSelect]);

    const table = useMemo(() => (
        <Table
            virtualized
            data={filteredData}
            bordered={true}
            autoHeight={true}
            rowKey="url"
            rowHeight={300}
            hover={false}
            showHeader={false}
            renderRow={renderRow}
        >
            <Column flexGrow={1}>
                <HeaderCell/>
                <Cell dataKey="title"/>
            </Column>
        </Table>
    ), [filteredData, renderRow]);

    return (
        <>
            {newsList && newsList.length > 0 && (
                <VStack align="stretch" width={'75vw'} gap={10} marginTop={50}>
                    <Text width={'fit-content'} size={'3xl'} weight={'semibold'} className={'title'}>
                        Your News List
                    </Text>
                    <Text>
                        Found {newsList.length} articles
                        {filteredData.length !== newsList.length && `, ${filteredData.length} kept by the filters`}.
                    </Text>
                    {wider && (
                        <HStack spacing={8} alignItems="center" marginTop={4}>
                            <Text muted size="sm">
                                Every word is asked for at once, so only these have
                                all of {wider.terms.join(', ')}. {wider.found} have at least one.
                            </Text>
                            <Button appearance="link" size="sm" style={{padding: 0}}
                                    onClick={() => onWiden(wider.terms.join(', '))}>
                                Show those {wider.found}
                            </Button>
                        </HStack>
                    )}
                    <Box pos="relative" paddingTop={20} paddingBottom={20}>
                        <Box mb={10}>
                            <HStack spacing={8} alignItems="center">
                                <Button
                                    appearance="ghost"
                                    color={'orange'}
                                    onClick={() => setShowFilterPanel(!showFilterPanel)}
                                    startIcon={countActiveFilters() > 0 ? <VscFilterFilled /> : <VscFilter />}
                                >
                                    {countActiveFilters() > 0 ? 'Filters Applied' : 'Filter'}
                                    {countActiveFilters() > 0 && (
                                        <Tag color="orange" style={{ marginLeft: 8 }}>
                                            {countActiveFilters()}
                                        </Tag>
                                    )}
                                </Button>

                                {countActiveFilters() > 0 && (
                                    <Button
                                        appearance="subtle"
                                        color="red"
                                        startIcon={<TbFilterOff />}
                                        onClick={clearFilters}
                                    >
                                        Clear Filters
                                    </Button>
                                )}
                            </HStack>
                        </Box>

                        {showFilterPanel && (
                            <VStack mb={20} p={15} bd="1px solid #e5e5ea" rounded={6}>
                                <HStack spacing={10} w="100%">
                                    <VStack w="100%">
                                        <Box>Source</Box>
                                        <SelectPicker
                                            data={getSources()}
                                            block
                                            placeholder="Select city"
                                            value={sourceFilter}
                                            onChange={setSourceFilter}
                                            cleanable
                                        />
                                    </VStack>

                                    <VStack w="100%">
                                        <Box>Time</Box>
                                        <SelectPicker
                                            data={[
                                                { label: 'Newest First', value: 'desc' },
                                                { label: 'Oldest First', value: 'asc' }
                                            ]}
                                            block
                                            searchable={false}
                                            cleanable={false}
                                            value={timeFilter}
                                            onChange={setTimeFilter}
                                        />
                                    </VStack>
                                </HStack>

                                <HStack spacing={10} w="100%" mt={10}>
                                    <VStack w="100%">
                                        <Box>How widely it is carried</Box>
                                        <SelectPicker
                                            data={[
                                                { label: 'Carried by several media', value: 'several' },
                                                { label: 'Several media, each its own wording', value: 'wordings' },
                                                { label: 'This source only', value: 'alone' },
                                            ]}
                                            block
                                            searchable={false}
                                            value={coverageFilter}
                                            onChange={setCoverageFilter}
                                            cleanable
                                        />
                                    </VStack>

                                    <VStack w="100%">
                                        <Box>The article says it has no confirmation</Box>
                                        <SelectPicker
                                            data={getWordings()}
                                            block
                                            searchable={false}
                                            placeholder={getWordings().length > 1 ? 'Any word' : 'None in these results'}
                                            disabled={getWordings().length <= 1}
                                            value={wordingFilter}
                                            onChange={setWordingFilter}
                                            cleanable
                                        />
                                    </VStack>
                                </HStack>

                                <Text muted size="sm" mt={10}>
                                    These describe what was counted, not whether a news is true: a rumour
                                    carried by twenty media is still a rumour, and a paper writing
                                    "reportedly" is telling you it could not confirm.
                                </Text>

                                <HStack mt={15} justify="flex-end" spacing={10}>
                                    <Button appearance="subtle" onClick={() => setShowFilterPanel(false)}>
                                        Cancel
                                    </Button>
                                    <Button appearance="primary" color={'orange'} onClick={applyFilters} startIcon={<TbFilter />}>
                                        Apply Filters
                                    </Button>
                                </HStack>
                            </VStack>
                        )}
                        {table}
                        {/*{loading && <FixedLoader />}*/}
                    </Box>
                    {/*<List divider={false} hover={false} size={'lg'}>*/}
                    {/*    {newsList.map((news, index) => (news && (*/}
                    {/*        <List.Item key={index} padding={20} backgroundColor={'transparent'}>*/}
                    {/*            <Article id={index} onSelect={handleSelect} news={news}/>*/}
                    {/*        </List.Item>*/}
                    {/*    )))}*/}
                    {/*</List>*/}
                </VStack>
            )}
            {!newsList && (
                <Text weight={'semibold'} size={'xl'}>No news found...</Text>
            )}
            {selectedCount > 0 && (
                <Button
                    position={'fixed'}
                    right={20}
                    bottom={10}
                    startIcon={<FaMagic />}
                    color={'orange'}
                    appearance="primary"
                    loading={isGenerating}
                    onClick={() => onGenerate(selectedIds.current)}
                >Generate AI Resume</Button>
            )}
        </>
    )
}