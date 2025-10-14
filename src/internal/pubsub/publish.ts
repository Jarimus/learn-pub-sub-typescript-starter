import type { Channel, ConfirmChannel } from "amqplib";
import amqp from 'amqplib'

export type SimpleQueueType = "durable" | "transient"

export async function publishJSON<T>(
  ch: ConfirmChannel,
  exchange: string,
  routingKey: string,
  value: T,
): Promise<void> {
  const valueString = JSON.stringify(value)
  ch.publish(exchange, routingKey, Buffer.from(valueString), { contentType: 'application/json'})
}

export async function declareAndBind(
  conn: amqp.ChannelModel,
  exchange: string,
  queueName: string,
  key: string,
  queueType: SimpleQueueType,
): Promise<[Channel, amqp.Replies.AssertQueue]> {

  const channel = await conn.createConfirmChannel()
  const queue = await channel.assertQueue(queueName, {
    durable: queueType === "durable",
    autoDelete: queueType !== "durable",
    exclusive: queueType !== "durable",
  })
  await channel.bindQueue(queueName, exchange, key)
  return [channel, queue]
}