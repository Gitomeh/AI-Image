import { pool } from './connection';
import { ImageRepository } from '../repositories';
import { ImageMetadataRepository } from '../repositories';
import { PostRepository } from '../repositories';
import { EvaluationItemRepository } from '../repositories';
import { ImageEmbeddingRepository } from '../repositories';
import { PostEmbeddingRepository } from '../repositories';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  console.log('Seeding database with demo data...');
  
  try {
    const imageRepo = new ImageRepository();
    const imageMetadataRepo = new ImageMetadataRepository();
    const postRepo = new PostRepository();
    const evaluationRepo = new EvaluationItemRepository();
    const imageEmbeddingRepo = new ImageEmbeddingRepository();
    const postEmbeddingRepo = new PostEmbeddingRepository();

    // Clear existing data (in reverse order of dependencies)
    console.log('Clearing existing data...');
    await pool.query('DELETE FROM evaluation_items');
    await pool.query('DELETE FROM post_embeddings');
    await pool.query('DELETE FROM image_embeddings');
    await pool.query('DELETE FROM image_suggestions');
    await pool.query('DELETE FROM reviews');
    await pool.query('DELETE FROM image_metadata');
    await pool.query('DELETE FROM images');
    await pool.query('DELETE FROM posts');

    // Create demo images
    console.log('Creating demo images...');
    const images = [
      {
        filename: 'fox-01.jpg',
        source_url: 'https://images.unsplash.com/photo-1546951203-5b7273d2c496',
        subject: 'red fox',
        category: 'animal',
        attributes: ['orange fur', 'wild', 'forest', 'pointed ears', 'bushy tail'],
        caption: 'A red fox standing in a forest with orange fur',
        confidence: 0.94
      },
      {
        filename: 'fox-02.jpg',
        source_url: 'https://images.unsplash.com/photo-1474511320723-9a56873571b7',
        subject: 'red fox',
        category: 'animal',
        attributes: ['orange fur', 'wild', 'grassland', 'alert posture'],
        caption: 'Red fox alert in grassland with orange fur',
        confidence: 0.91
      },
      {
        filename: 'wolf-01.jpg',
        source_url: 'https://images.unsplash.com/photo-1504826260970-0f5d4167361b',
        subject: 'gray wolf',
        category: 'animal',
        attributes: ['gray fur', 'wild', 'forest', 'pack animal', 'sharp teeth'],
        caption: 'Gray wolf in forest with gray fur',
        confidence: 0.95
      },
      {
        filename: 'wolf-02.jpg',
        source_url: 'https://images.unsplash.com/photo-1564466809058-bf4114c5525f',
        subject: 'gray wolf',
        category: 'animal',
        attributes: ['gray fur', 'wild', 'snow', 'thick coat'],
        caption: 'Gray wolf in snow with thick gray coat',
        confidence: 0.93
      },
      {
        filename: 'dog-01.jpg',
        source_url: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb',
        subject: 'golden retriever',
        category: 'animal',
        attributes: ['golden fur', 'domestic', 'friendly', 'long hair'],
        caption: 'Golden retriever with friendly expression',
        confidence: 0.96
      },
      {
        filename: 'dog-02.jpg',
        source_url: 'https://images.unsplash.com/photo-1561037404-61cd46aa615b',
        subject: 'german shepherd',
        category: 'animal',
        attributes: ['brown fur', 'domestic', 'alert', 'pointed ears'],
        caption: 'German shepherd with alert posture',
        confidence: 0.94
      },
      {
        filename: 'bear-01.jpg',
        source_url: 'https://images.unsplash.com/photo-1589656966895-2f33e7653819',
        subject: 'brown bear',
        category: 'animal',
        attributes: ['brown fur', 'wild', 'forest', 'large', 'omnivore'],
        caption: 'Brown bear in forest with thick brown fur',
        confidence: 0.92
      },
      {
        filename: 'deer-01.jpg',
        source_url: 'https://images.unsplash.com/photo-1574757398541-765695fa57cd',
        subject: 'white-tailed deer',
        category: 'animal',
        attributes: ['brown fur', 'wild', 'forest', 'antlers', 'grazing'],
        caption: 'White-tailed deer grazing in forest',
        confidence: 0.90
      }
    ];

    const createdImages = [];
    for (const img of images) {
      const image = await imageRepo.create({
        filename: img.filename,
        source_url: img.source_url
      });
      
      await imageMetadataRepo.create({
        image_id: image.id,
        subject: img.subject,
        category: img.category,
        attributes: img.attributes,
        caption: img.caption,
        confidence: img.confidence
      });

      createdImages.push({ ...image, ...img });
      console.log(`  Created image: ${img.filename}`);
    }

    // Create demo posts
    console.log('Creating demo posts...');
    const posts = [
      {
        title: 'The Behavior of Red Foxes in the Wild',
        content: 'Red foxes are fascinating creatures that have adapted to various environments. They are known for their distinctive orange fur, bushy tails, and cunning behavior. These wild animals are found across the Northern Hemisphere and are highly adaptable to different habitats including forests, grasslands, and urban areas. Foxes are solitary hunters and are primarily nocturnal.'
      },
      {
        title: 'Understanding Wolf Pack Dynamics',
        content: 'Wolves are highly social animals that live in packs. Gray wolves work together to hunt and raise their young. These wild canines have complex social hierarchies and communicate through howls, body language, and scent marking. Wolf packs typically consist of a breeding pair and their offspring.'
      },
      {
        title: 'Caring for Your Domestic Dog',
        content: 'Dogs are loyal companions that require proper care and attention. Whether you have a golden retriever or a german shepherd, understanding your pet needs is essential. Regular exercise, proper nutrition, and veterinary care are key to keeping your domestic dog healthy and happy.'
      },
      {
        title: 'Brown Bears: Forest Giants',
        content: 'Brown bears are large omnivorous mammals found in forests across North America and Eurasia. These powerful animals are known for their thick brown fur and impressive size. Brown bears are solitary except during mating season and when raising cubs.'
      },
      {
        title: 'White-Tailed Deer: Graceful Forest Dwellers',
        content: 'White-tailed deer are common in North American forests. These graceful animals are known for their distinctive white tail and impressive antlers on males. Deer are herbivores that graze on leaves, twigs, and grasses in their forest habitat.'
      }
    ];

    const createdPosts = [];
    for (const post of posts) {
      const createdPost = await postRepo.create(post);
      createdPosts.push(createdPost);
      console.log(`  Created post: ${post.title}`);
    }

    // Create evaluation items
    console.log('Creating evaluation items...');
    const evaluationData = [
      { postIndex: 0, imageIndex: 0, notes: 'Fox article should match fox image' }, // fox post -> fox-01
      { postIndex: 0, imageIndex: 1, notes: 'Alternative fox match' }, // fox post -> fox-02
      { postIndex: 1, imageIndex: 2, notes: 'Wolf article should match wolf image' }, // wolf post -> wolf-01
      { postIndex: 1, imageIndex: 3, notes: 'Alternative wolf match' }, // wolf post -> wolf-02
      { postIndex: 2, imageIndex: 4, notes: 'Dog article should match dog image' }, // dog post -> dog-01
      { postIndex: 2, imageIndex: 5, notes: 'Alternative dog match' }, // dog post -> dog-02
      { postIndex: 3, imageIndex: 6, notes: 'Bear article should match bear image' }, // bear post -> bear-01
      { postIndex: 4, imageIndex: 7, notes: 'Deer article should match deer image' } // deer post -> deer-01
    ];

    for (const evalItem of evaluationData) {
      await evaluationRepo.create({
        post_id: createdPosts[evalItem.postIndex].id,
        expected_image_id: createdImages[evalItem.imageIndex].id,
        notes: evalItem.notes
      });
      console.log(`  Created evaluation: ${evalItem.notes}`);
    }

    // Note: Embeddings will be generated when the matching system is used
    // They require AI API calls, so we don't generate them during seeding
    console.log('');
    console.log('Seed completed successfully!');
    console.log('');
    console.log('Summary:');
    console.log(`  - ${createdImages.length} images created`);
    console.log(`  - ${createdPosts.length} posts created`);
    console.log(`  - ${evaluationData.length} evaluation items created`);
    console.log('');
    console.log('Note: Embeddings will be generated when you use the matching API.');
    console.log('      This requires a valid GEMINI_API_KEY in your .env file.');

  } catch (error) {
    console.error('Seed failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seed().catch(console.error);
