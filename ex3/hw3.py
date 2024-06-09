from helper_classes import *
import matplotlib.pyplot as plt


def render_scene(camera: np.array, ambient: np.array, lights : list[LightSource], objects: list[Object3D], screen_size: tuple[float, float], max_depth: int):
    width, height = screen_size
    ratio = float(width) / height
    screen = (-1, 1 / ratio, 1, -1 / ratio)  # left, top, right, bottom

    image = np.zeros((height, width, 3))

    for i, y in enumerate(np.linspace(screen[1], screen[3], height)):
        for j, x in enumerate(np.linspace(screen[0], screen[2], width)):
            # screen is on origin
            pixel = np.array([x, y, 0])
            origin = camera
            direction = normalize(pixel - origin)
            ray = Ray(origin, direction)

            color = get_color(ray, objects, lights, camera, ambient, max_depth)
            
            # We clip the values between 0 and 1 so all pixel values will make sense.
            image[i, j] = np.clip(color,0,1)

    return image    


def get_color(ray: Ray, objects: list[Object3D], lights: list[LightSource], camera: np.array, ambient: np.array, max_depth: int, level:int=0) -> np.array:
    if level > max_depth:
        return np.zeros(3)

    min_distance, nearest_object = ray.nearest_intersected_object(objects)
    if nearest_object is None:
        return np.zeros(3)

    intersection = ray.origin + (min_distance * ray.direction)
    normal_to_surface_at_intersection = nearest_object.compute_normal(intersection)
    intersection += normal_to_surface_at_intersection * EPSILON * 10 # move intersection point a little bit to avoid bugs

    color = np.float64(nearest_object.ambient * ambient)
    direction_to_camera = normalize(camera - intersection)
    for light in lights:
        light_ray = light.get_light_ray(intersection)
        if is_light_visible(light_ray, objects, min_distance):
            light_intensity = light.get_intensity(intersection)
            reflected_light_direction = normalize(reflected(light_ray.direction, normal_to_surface_at_intersection))
            color += nearest_object.calc_diffuse(light_intensity, normal_to_surface_at_intersection, light_ray.direction)
            color += nearest_object.calc_specular(light_intensity, direction_to_camera, reflected_light_direction)
    
    reflected_ray = Ray(intersection, normalize(reflected(ray.direction, normal_to_surface_at_intersection)))
    color +=  nearest_object.reflection * get_color(reflected_ray, objects, lights, camera, ambient, max_depth, level + 1)

    return color


def is_light_visible(light_ray: Ray, objects: list[Object3D], min_distance: float) -> bool:
    distance_of_nearest_object_to_light, nearest_object_to_light  = light_ray.nearest_intersected_object(objects)
    return not nearest_object_to_light or distance_of_nearest_object_to_light >= min_distance


def your_own_scene():
    """
    Trying to create a scene with 'infinite' reflections.
    """
    camera = np.array([0,0,1])
    lights = [PointLight(intensity=np.array([0.7, 0.7, 0.7]), position=np.array([0.4, 0.4, 1]), kc=1, kl=1, kq=1),
              PointLight(intensity=np.array([0.7, 0.7, 0.7]), position=np.array([-0.4, -0.4, 1]), kc=1, kl=1, kq=1),
              DirectionalLight(np.array([0.3, 0.3, 0.3]), np.array([0, 0, 1]))]
    
    mirrors = [Plane(np.array([0, 0, 1]), np.array([0, 0, -1])), 
               Plane(np.array([0, 1, 0]), np.array([0, -1, 0])), 
               Plane(np.array([1, 0, 0]), np.array([-1, 0, 0]))]
    
    for mirror in mirrors:
        mirror.set_material([0.2, 0.2, 0.2], [0.2, 0.2, 0.2], [1, 1, 1], 1000, 0.5)

    objects = [Sphere(np.array([0.4, 0.4, 0]), 0.2), 
               Sphere(np.array([-0.4, -0.4, 0]), 0.2),
               Triangle(np.array([0.4, -0.4, 0]), np.array([-0.4, 0.4, 0]), np.array([-0.1, -0.1, -0.4])),
               Triangle(np.array([0.4, -0.4, 0]), np.array([-0.4, 0.4, 0]), np.array([0.1, 0.1, -0.4]))]
               
    for obj in objects:
        obj.set_material([0, 1, 0], [0, 1, 0], [0.3, 0.3, 0.3], 100, 0.2)

    objects += mirrors

    return camera, lights, objects
