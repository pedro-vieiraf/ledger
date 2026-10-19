import { Tabs, TabList, TabSlot, TabTrigger } from 'expo-router/ui';
import { Text } from 'react-native';

export default function AppTabs() {
  return (
    <Tabs
      style={{
        flex: 1,
        backgroundColor: '#F7F7F2',
      }}
    >
      <TabSlot
        style={{
          flex: 1,
        }}
      />

      <TabList
        style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7E1',
        }}
      >
        <TabTrigger
          name="index"
          href="/"
          style={({ pressed }) => ({
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 10,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: '#1F5B45',
            }}
          >
            Início
          </Text>
        </TabTrigger>

        <TabTrigger
          name="transactions"
          href="/transactions"
          style={({ pressed }) => ({
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 10,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: '#1F5B45',
            }}
          >
            Transações
          </Text>
        </TabTrigger>

        <TabTrigger
          name="accounts"
          href="/accounts"
          style={({ pressed }) => ({
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 10,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: '#1F5B45',
            }}
          >
            Contas
          </Text>
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}