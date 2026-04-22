import {List, Box, Table, Loader, VStack, toaster, Message, Text, Button, SelectPicker, HStack, Tag, } from "rsuite";
import {useCallback, useEffect, useRef, useState} from "react";
import {FaMagic} from "react-icons/fa";
import {Article} from "../article/Article.jsx";
import {VscFilter, VscFilterFilled} from "react-icons/vsc";
import {TbFilter, TbFilterOff} from "react-icons/tb";


const { Column, HeaderCell, Cell } = Table;

export const FeedList = ({newsList}) => {
    const selectedIds = useRef([]);
    const [selectedCount, setSelectedCount] = useState(0);
    const [filteredData, setFilteredData] = useState(newsList);
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [sourceFilter, setSourceFilter] = useState(null);
    const [timeFilter, setTimeFilter] = useState(null);

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
        const sources = [...newsList.map(item => item.source)];
        return sources.map(source => ({ label: source, value: source }));
    };

    const applyFilters = () => {
        let result = [...newsList];

        // Apply source filter
        if (sourceFilter) {
            result = result.filter(item => item.source === sourceFilter);
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
        setFilteredData(newsList);
    };

    const countActiveFilters = () => {
        let count = 0;
        if (sourceFilter) count++;
        if (timeFilter) count++;
        return count;
    };

    useEffect(() => {
        setFilteredData(newsList);
    }, [newsList]);

    return (
        <>
            {newsList && newsList.length > 0 && (
                <VStack align="stretch" width={'75vw'} gap={10} marginTop={50}>
                    <Text width={'fit-content'} size={'3xl'} weight={'semibold'} className={'title'}>
                        Your News List
                    </Text>
                    <Text>Found {newsList.length} articles.</Text>
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
                        <Table
                            virtualized
                            data={filteredData}
                            bordered={true}
                            autoHeight={true}
                            rowKey="url"
                            rowHeight={300}
                            hover={false}
                            showHeader={false}
                            renderRow={(children, rowData) => (
                                <Box padding={20}>
                                    <Article
                                        id={rowData.url}
                                        onSelect={handleSelect}
                                        news={rowData}
                                    />
                                </Box>
                            )}
                        >
                            <Column flexGrow={1} >
                                <HeaderCell/>
                                <Cell dataKey="title"/>
                            </Column>
                        </Table>
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
                    href={'#'}
                    color={'orange'}
                    appearance="primary"
                >Generate AI Resume</Button>
            )}
        </>
    )
}